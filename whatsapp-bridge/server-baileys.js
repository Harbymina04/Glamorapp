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
const AUTH_ROOT = '/tmp/baileys-auth'; // cada sesión en subdirectorio

// ─── Session Manager ──────────────────────────────────────────
const sessions = new Map(); // sessionId → { sock, qr, connected, connectionState, phone, startedAt }

function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

/**
 * Get or create auth dir for a session
 */
function sessionAuthDir(sessionId) {
  return path.join(AUTH_ROOT, sessionId);
}

/**
 * Start a WhatsApp session for a given sessionId + phone number.
 * If already running, returns existing state.
 */
async function startSession(sessionId, phone) {
  if (sessions.has(sessionId)) {
    const s = sessions.get(sessionId);
    return { sessionId, status: s.connectionState, phone: s.phone, startedAt: s.startedAt };
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
    const { connection, lastDisconnect, qr, isNewLogin } = update;

    if (qr && !sessionData.pairingRequested) {
      sessionData.qr = qr;
      sessionData.connectionState = 'qr_ready';
      console.log(`[${sessionId}] 📱 QR generado`);
    }

    if (connection === 'open') {
      sessionData.connected = true;
      sessionData.connectionState = 'connected';
      sessionData.qr = null;
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
        setTimeout(() => startSession(sessionId, phone), 3000);
      } else {
        sessionData.connectionState = 'logged_out';
        console.log(`[${sessionId}] ⚠️ Sesión cerrada permanentemente. Borra ${authDir} para reiniciar.`);
      }
    }
  });

  return { sessionId, status: sessionData.connectionState, phone: sessionData.phone, startedAt: sessionData.startedAt };
}

/**
 * Stop a session
 */
async function stopSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return { error: 'Sesión no encontrada' };
  try {
    s.sock?.end();
    s.sock?.ws?.close();
  } catch(e) {}
  sessions.delete(sessionId);
  console.log(`[${sessionId}] 🛑 Sesión detenida`);
  return { success: true, sessionId };
}

// ─── API Routes ─────────────────────────────────────────────────

// Health / overview — para monitoreo desde el admin panel
app.get('/api/status', auth, (req, res) => {
  const sessionList = [];
  for (const [id, s] of sessions) {
    sessionList.push({
      sessionId: id,
      phone: s.phone,
      status: s.connectionState,
      connected: s.connected,
      startedAt: s.startedAt,
    });
  }
  res.json({
    uptime: process.uptime(),
    totalSessions: sessions.size,
    connectedSessions: sessionList.filter(s => s.connected).length,
    sessions: sessionList,
  });
});

// List all sessions (misma data que status, endpoint dedicado)
app.get('/api/sessions', auth, (req, res) => {
  const list = [];
  for (const [id, s] of sessions) {
    list.push({
      sessionId: id,
      phone: s.phone,
      status: s.connectionState,
      connected: s.connected,
      startedAt: s.startedAt,
    });
  }
  res.json(list);
});

// Session-specific status
app.get('/api/sessions/:sessionId/status', auth, (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Sesión no encontrada' });
  res.json({
    sessionId: req.params.sessionId,
    phone: s.phone,
    status: s.connectionState,
    connected: s.connected,
    startedAt: s.startedAt,
  });
});

// Start a session — idempotent
app.post('/api/sessions/:sessionId/start', auth, async (req, res) => {
  try {
    const result = await startSession(req.params.sessionId, req.body.phone);
    res.json(result);
  } catch(e) {
    console.error(`Error starting session ${req.params.sessionId}:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// Stop a session
app.post('/api/sessions/:sessionId/stop', auth, async (req, res) => {
  const result = await stopSession(req.params.sessionId);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

// Get QR for a session
app.get('/api/sessions/:sessionId/qr', auth, (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Sesión no encontrada' });
  if (s.connected) return res.json({ status: 'already_connected' });
  if (!s.qr) return res.status(404).json({ error: 'QR no disponible aún' });
  res.json({ qr: s.qr, status: s.connectionState });
});

// Pairing code for a session
app.post('/api/sessions/:sessionId/pair', auth, async (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Sesión no encontrada. Iníciala primero con POST /sessions/:id/start' });
  if (!s.sock) return res.status(503).json({ error: 'Socket no inicializado' });

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone requerido (ej: +521234567890)' });

  try {
    s.pairingRequested = true;
    const code = await s.sock.requestPairingCode(phone);
    s.phone = phone;
    console.log(`[${req.params.sessionId}] 🔢 Código de emparejamiento: ${code}`);
    res.json({
      success: true,
      code,
      message: 'Revisa tu WhatsApp — debería aparecer una notificación para vincular.',
    });
  } catch(e) {
    s.pairingRequested = false;
    console.error(`[${req.params.sessionId}] Error pairing:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// Send message (now requires sessionId in body)
app.post('/api/sendText', auth, async (req, res) => {
  const { chatId, text, sessionId } = req.body;
  if (!chatId || !text) return res.status(400).json({ error: 'chatId y text requeridos' });
  if (!sessionId) return res.status(400).json({ error: 'sessionId requerido (multi-tenant)' });

  const s = sessions.get(sessionId);
  if (!s) return res.status(404).json({ error: `Sesión '${sessionId}' no encontrada` });
  if (!s.connected) return res.status(503).json({ error: `Sesión '${sessionId}' no conectada (${s.connectionState})` });

  try {
    const jid = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
    const msg = await s.sock.sendMessage(jid, { text });
    res.json({ success: true, id: msg.key.id, sessionId });
  } catch(e) {
    console.error(`[${sessionId}] Error enviando:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Start Bridge ───────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Bridge multi-sesión en puerto ${PORT}`);
  console.log(`🔑 API Key: ${API_KEY}`);
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /api/status                    — overview + todas las sesiones');
  console.log('  GET  /api/sessions                  — listar sesiones');
  console.log('  GET  /api/sessions/:id/status       — estado de una sesión');
  console.log('  POST /api/sessions/:id/start        — iniciar sesión {phone?}');
  console.log('  POST /api/sessions/:id/stop         — detener sesión');
  console.log('  GET  /api/sessions/:id/qr           — QR de sesión');
  console.log('  POST /api/sessions/:id/pair         — pairing code {phone}');
  console.log('  POST /api/sendText                  — enviar {chatId, text, sessionId}');
  console.log('');
});
