const express = require('express');
const fs = require('fs');
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = 8082;
const API_KEY = 'glamorapp_wa_2026';
const AUTH_ROOT = '/tmp/baileys-auth';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/api/v1/whatsapp/webhook';

// ─── Session Manager ──────────────────────────────────────────
const sessions = new Map(); // sessionId → { sock, qr, connected, connectionState, phone, startedAt }

function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function sessionAuthDir(sessionId) {
  return path.join(AUTH_ROOT, sessionId);
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Gracefully close a socket without throwing.
 */
function closeSocket(sock) {
  try { sock?.end(undefined); } catch (_) {}
  try { sock?.ws?.close(); } catch (_) {}
}

/**
 * Start (or restart) a WhatsApp session.
 * FIX: does NOT check sessions.has() so reconnect always creates a fresh socket.
 */
async function startSession(sessionId, phone) {
  // Clean up any existing socket before starting fresh
  const existing = sessions.get(sessionId);
  if (existing) {
    closeSocket(existing.sock);
    sessions.delete(sessionId);
  }

  const authDir = sessionAuthDir(sessionId);
  fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sessionData = {
    sock: null,
    qr: null,
    connected: false,
    connectionState: 'initializing',
    phone: phone || null,
    startedAt: new Date().toISOString(),
    pairingRequested: false,
  };
  sessions.set(sessionId, sessionData);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    browser: ['Glamorapp', 'Chrome', '1.0'],
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 25_000,
  });

  sessionData.sock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !sessionData.pairingRequested) {
      sessionData.qr = qr;
      sessionData.connectionState = 'qr_ready';
      console.log(`[${sessionId}] 📱 QR generado`);
    }

    if (connection === 'open') {
      sessionData.connected = true;
      sessionData.connectionState = 'connected';
      sessionData.qr = null;
      sessionData.pairingRequested = false;
      if (sock.user?.id) {
        sessionData.phone = sock.user.id.split(':')[0];
      }
      console.log(`[${sessionId}] ✅ Conectado — ${sessionData.phone}`);
    }

    if (connection === 'close') {
      sessionData.connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`[${sessionId}] ❌ Desconectado (código: ${code}). Reconectar: ${shouldReconnect}`);

      if (shouldReconnect) {
        sessionData.connectionState = 'reconnecting';
        sessionData.qr = null;
        // FIX: delete from map BEFORE calling startSession so it creates a fresh socket
        setTimeout(async () => {
          sessions.delete(sessionId);
          try { await startSession(sessionId, phone); }
          catch (e) { console.error(`[${sessionId}] Error al reconectar:`, e.message); }
        }, 4000);
      } else {
        sessionData.connectionState = 'logged_out';
        console.log(`[${sessionId}] ⚠️ Sesión cerrada permanentemente. Borra ${authDir} para reiniciar.`);
      }
    }
  });

  // ─── Incoming messages → forward to backend webhook ──────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return; // only real-time messages

    for (const msg of messages) {
      // Skip messages sent by us, status updates, and non-text messages
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid === 'status@broadcast') continue;
      if (msg.key.remoteJid?.endsWith('@g.us')) continue; // ignorar grupos

      const from = msg.key.remoteJid?.replace(/@s\.whatsapp\.net|@lid|@c\.us/, '') || '';
      const body = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        ''
      ).trim();

      if (!body) continue;

      const fromName = msg.pushName || from;
      console.log(`[${sessionId}] 📩 Mensaje de ${from} (${fromName}): ${body.substring(0, 80)}`);

      // Forward to backend webhook
      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
          body: JSON.stringify({ sessionId, from, fromName, body, timestamp: Date.now() }),
        });
      } catch (e) {
        console.error(`[${sessionId}] Error enviando webhook:`, e.message);
      }
    }
  });

  return { sessionId, status: sessionData.connectionState, phone: sessionData.phone, startedAt: sessionData.startedAt };
}

/**
 * Stop and remove a session.
 */
async function stopSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return { error: 'Sesión no encontrada' };
  closeSocket(s.sock);
  sessions.delete(sessionId);
  console.log(`[${sessionId}] 🛑 Sesión detenida`);
  return { success: true, sessionId };
}

// ─── API Routes ──────────────────────────────────────────────────

app.get('/api/status', auth, (req, res) => {
  const sessionList = [];
  for (const [id, s] of sessions) {
    sessionList.push({ sessionId: id, phone: s.phone, status: s.connectionState, connected: s.connected, startedAt: s.startedAt });
  }
  res.json({ uptime: process.uptime(), totalSessions: sessions.size, connectedSessions: sessionList.filter(s => s.connected).length, sessions: sessionList });
});

app.get('/api/sessions', auth, (req, res) => {
  const list = [];
  for (const [id, s] of sessions) {
    list.push({ sessionId: id, phone: s.phone, status: s.connectionState, connected: s.connected, startedAt: s.startedAt });
  }
  res.json(list);
});

app.get('/api/sessions/:sessionId/status', auth, (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Sesión no encontrada' });
  res.json({ sessionId: req.params.sessionId, phone: s.phone, status: s.connectionState, connected: s.connected, startedAt: s.startedAt });
});

// Start — always idempotent: if already connected, skip; otherwise start fresh
app.post('/api/sessions/:sessionId/start', auth, async (req, res) => {
  const existing = sessions.get(req.params.sessionId);
  if (existing?.connected) {
    return res.json({ sessionId: req.params.sessionId, status: 'connected', phone: existing.phone, startedAt: existing.startedAt });
  }
  try {
    const result = await startSession(req.params.sessionId, req.body?.phone);
    res.json(result);
  } catch (e) {
    console.error(`Error starting session ${req.params.sessionId}:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// Stop
app.post('/api/sessions/:sessionId/stop', auth, async (req, res) => {
  const result = await stopSession(req.params.sessionId);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

// Reset — force clears auth files and restarts (useful when QR expired or stuck)
app.post('/api/sessions/:sessionId/reset', auth, async (req, res) => {
  await stopSession(req.params.sessionId).catch(() => {});
  const authDir = sessionAuthDir(req.params.sessionId);
  try { fs.rmSync(authDir, { recursive: true, force: true }); } catch (_) {}
  console.log(`[${req.params.sessionId}] 🔄 Sesión reseteada — credenciales borradas`);
  try {
    const result = await startSession(req.params.sessionId, req.body?.phone);
    res.json({ ...result, reset: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get QR
app.get('/api/sessions/:sessionId/qr', auth, (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Sesión no encontrada' });
  if (s.connected) return res.json({ status: 'already_connected' });
  if (!s.qr) return res.status(404).json({ error: 'QR no disponible aún', currentStatus: s.connectionState });
  res.json({ qr: s.qr, status: s.connectionState });
});

/**
 * Pairing code endpoint — FIX: restarts session if socket is dead/stuck,
 * waits up to 10s for the socket to connect to WA servers before requesting code.
 */
app.post('/api/sessions/:sessionId/pair', auth, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone requerido (ej: +573001234567)' });

  const sessionId = req.params.sessionId;
  let s = sessions.get(sessionId);

  // If session is dead/stuck, force restart
  const badStates = ['reconnecting', 'logged_out', 'error'];
  if (!s || !s.sock || badStates.includes(s.connectionState)) {
    console.log(`[${sessionId}] 🔄 Reiniciando sesión para pairing (estado previo: ${s?.connectionState || 'none'})`);
    try {
      await startSession(sessionId, phone);
    } catch (e) {
      return res.status(500).json({ error: `Error iniciando sesión: ${e.message}` });
    }
  }

  // Wait up to 10s for socket to reach qr_ready or initializing (connected to WA but not auth'd)
  console.log(`[${sessionId}] ⏳ Esperando conexión al servidor WA...`);
  for (let i = 0; i < 10; i++) {
    s = sessions.get(sessionId);
    if (s?.connected) return res.json({ success: false, error: 'La sesión ya está conectada, no necesitas código de emparejamiento.' });
    if (s?.connectionState === 'qr_ready' || s?.connectionState === 'initializing') break;
    await delay(1000);
  }

  s = sessions.get(sessionId);
  if (!s?.sock) return res.status(503).json({ error: 'No se pudo conectar al servidor de WhatsApp. Intenta de nuevo.' });

  try {
    s.pairingRequested = true;
    const cleanPhone = phone.replace(/[+\s\-()]/g, '');
    console.log(`[${sessionId}] 📲 Solicitando código de emparejamiento para ${cleanPhone}`);
    const code = await s.sock.requestPairingCode(cleanPhone);
    s.phone = phone;
    console.log(`[${sessionId}] 🔢 Código generado: ${code}`);
    res.json({ success: true, code, message: 'Revisa tu WhatsApp — aparecerá una notificación para vincular el dispositivo.' });
  } catch (e) {
    s.pairingRequested = false;
    console.error(`[${sessionId}] Error pairing:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// Send message
app.post('/api/sendText', auth, async (req, res) => {
  const { chatId, text, sessionId } = req.body;
  if (!chatId || !text) return res.status(400).json({ error: 'chatId y text requeridos' });
  if (!sessionId) return res.status(400).json({ error: 'sessionId requerido' });

  const s = sessions.get(sessionId);
  if (!s) return res.status(404).json({ error: `Sesión '${sessionId}' no encontrada` });
  if (!s.connected) return res.status(503).json({ error: `Sesión '${sessionId}' no conectada (${s.connectionState})` });

  try {
    const jid = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
    const msg = await s.sock.sendMessage(jid, { text });
    res.json({ success: true, id: msg.key.id, sessionId });
  } catch (e) {
    console.error(`[${sessionId}] Error enviando:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Start Bridge ────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Bridge multi-sesión en puerto ${PORT}`);
  console.log(`🔑 API Key: ${API_KEY}`);
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /api/status                       — overview + todas las sesiones');
  console.log('  POST /api/sessions/:id/start           — iniciar sesión');
  console.log('  POST /api/sessions/:id/stop            — detener sesión');
  console.log('  POST /api/sessions/:id/reset           — borrar credenciales y reiniciar');
  console.log('  GET  /api/sessions/:id/status          — estado de una sesión');
  console.log('  GET  /api/sessions/:id/qr              — QR de sesión');
  console.log('  POST /api/sessions/:id/pair  {phone}   — código de emparejamiento');
  console.log('  POST /api/sendText  {chatId,text,sessionId}  — enviar mensaje');
  console.log('');
});
