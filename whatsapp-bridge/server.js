/**
 * WhatsApp Bridge — whatsapp-web.js (Puppeteer + Chromium)
 * Supports @lid contacts (WhatsApp multi-device / privacy mode)
 * Multi-session via Map, auto-restores sessions on startup
 */
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = 8082;
const API_KEY = 'glamorapp_wa_2026';
const WA_SESSION_DIR = '/tmp/wwjs-sessions';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001/api/v1/whatsapp/webhook';

// ─── Auth ────────────────────────────────────────────────────────
function auth(req, res, next) {
  if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ─── Session store ───────────────────────────────────────────────
// sessionId → { client, status, qr, phone, startedAt }
const sessions = new Map();

function getSessionDir(sessionId) {
  return path.join(WA_SESSION_DIR, sessionId);
}

async function startSession(sessionId) {
  if (sessions.has(sessionId)) {
    const s = sessions.get(sessionId);
    if (s.status === 'connected' || s.status === 'initializing') {
      return { sessionId, status: s.status, phone: s.phone, startedAt: s.startedAt };
    }
    // Clean up stuck session
    try { await s.client.destroy(); } catch (_) {}
    sessions.delete(sessionId);
  }

  const sessionData = {
    client: null,
    status: 'initializing',
    qr: null,
    phone: null,
    startedAt: new Date().toISOString(),
  };
  sessions.set(sessionId, sessionData);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sessionId, dataPath: WA_SESSION_DIR }),
    puppeteer: {
      executablePath: '/usr/bin/chromium-browser',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--single-process',
        '--no-zygote',
      ],
    },
    webVersionCache: { type: 'none' },
  });

  sessionData.client = client;

  client.on('qr', async (qr) => {
    sessionData.qr = qr;
    sessionData.status = 'qr_ready';
    console.log(`[${sessionId}] 📱 QR generado`);
  });

  client.on('authenticated', () => {
    console.log(`[${sessionId}] 🔐 Autenticado`);
    sessionData.status = 'authenticated';
  });

  client.on('ready', () => {
    sessionData.status = 'connected';
    sessionData.qr = null;
    sessionData.phone = client.info?.wid?.user || null;
    console.log(`[${sessionId}] ✅ Conectado — ${sessionData.phone}`);
  });

  client.on('disconnected', (reason) => {
    sessionData.status = 'disconnected';
    console.log(`[${sessionId}] ❌ Desconectado: ${reason}`);
    // Auto-reconnect after 5s
    setTimeout(async () => {
      sessions.delete(sessionId);
      try { await startSession(sessionId); } catch (e) {
        console.error(`[${sessionId}] Error reconectando:`, e.message);
      }
    }, 5000);
  });

  // ── Incoming messages → forward to backend webhook ─────────────
  client.on('message', async (msg) => {
    if (msg.fromMe) return;
    if (msg.from === 'status@broadcast') return;
    if (msg.from.endsWith('@g.us')) return; // ignore groups
    if (msg.type !== 'chat') return; // only text messages

    const fromJid = msg.from; // e.g. '573001234567@c.us'
    const from = fromJid.replace('@c.us', '').replace('@s.whatsapp.net', '');
    const body = msg.body?.trim() || '';
    if (!body) return;

    const fromName = msg._data?.notifyName || from;
    console.log(`[${sessionId}] 📩 Mensaje de ${fromJid} (${fromName}): ${body.substring(0, 80)}`);

    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
        body: JSON.stringify({ sessionId, from, fromJid, fromName, body, timestamp: Date.now() }),
      });
    } catch (e) {
      console.error(`[${sessionId}] Error enviando webhook:`, e.message);
    }
  });

  client.initialize().catch(e => {
    console.error(`[${sessionId}] Error inicializando:`, e.message);
    sessionData.status = 'error';
  });

  return { sessionId, status: sessionData.status, phone: sessionData.phone, startedAt: sessionData.startedAt };
}

async function stopSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return { error: 'Sesión no encontrada' };
  try { await s.client?.destroy(); } catch (_) {}
  sessions.delete(sessionId);
  console.log(`[${sessionId}] 🛑 Sesión detenida`);
  return { success: true, sessionId };
}

// ─── API Routes ──────────────────────────────────────────────────

app.get('/api/status', auth, (req, res) => {
  const list = [];
  for (const [id, s] of sessions) {
    list.push({ sessionId: id, phone: s.phone, status: s.status, connected: s.status === 'connected', startedAt: s.startedAt });
  }
  res.json({ uptime: process.uptime(), totalSessions: sessions.size, connectedSessions: list.filter(s => s.connected).length, sessions: list });
});

app.get('/api/sessions/:sessionId/status', auth, (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Sesión no encontrada' });
  res.json({ sessionId: req.params.sessionId, phone: s.phone, status: s.status, connected: s.status === 'connected', startedAt: s.startedAt });
});

app.post('/api/sessions/:sessionId/start', auth, async (req, res) => {
  try {
    const result = await startSession(req.params.sessionId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sessions/:sessionId/stop', auth, async (req, res) => {
  const result = await stopSession(req.params.sessionId);
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

app.post('/api/sessions/:sessionId/reset', auth, async (req, res) => {
  await stopSession(req.params.sessionId).catch(() => {});
  const dir = getSessionDir(req.params.sessionId);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
  console.log(`[${req.params.sessionId}] 🔄 Sesión reseteada`);
  try {
    const result = await startSession(req.params.sessionId);
    res.json({ ...result, reset: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/sessions/:sessionId/qr', auth, (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Sesión no encontrada' });
  if (s.status === 'connected') return res.json({ status: 'already_connected' });
  if (!s.qr) return res.status(404).json({ error: 'QR no disponible aún', currentStatus: s.status });
  res.json({ qr: s.qr, status: s.status });
});

app.post('/api/sessions/:sessionId/pair', auth, async (req, res) => {
  res.json({ success: false, error: 'Pairing code no soportado en whatsapp-web.js. Usa QR.' });
});

app.post('/api/sendText', auth, async (req, res) => {
  const { chatId, text, sessionId } = req.body;
  if (!chatId || !text || !sessionId) return res.status(400).json({ error: 'chatId, text y sessionId requeridos' });

  const s = sessions.get(sessionId);
  if (!s) return res.status(404).json({ error: `Sesión '${sessionId}' no encontrada` });
  if (s.status !== 'connected') return res.status(503).json({ error: `Sesión '${sessionId}' no conectada (${s.status})` });

  try {
    // whatsapp-web.js uses @c.us suffix for individual chats
    const jid = chatId.includes('@') ? chatId.replace('@s.whatsapp.net', '@c.us').replace('@lid', '@c.us') : `${chatId}@c.us`;
    const msg = await s.client.sendMessage(jid, text);
    console.log(`[${sessionId}] ✉️ Enviado a ${jid} (id: ${msg.id._serialized})`);
    res.json({ success: true, id: msg.id._serialized, sessionId, jid });
  } catch (e) {
    console.error(`[${sessionId}] Error enviando a ${chatId}:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────

fs.mkdirSync(WA_SESSION_DIR, { recursive: true });

app.listen(PORT, async () => {
  console.log(`🚀 WhatsApp Bridge (whatsapp-web.js) en puerto ${PORT}`);
  console.log(`🔑 API Key: ${API_KEY}`);
  console.log(`🌐 Webhook: ${WEBHOOK_URL}`);
  console.log('');

  // Auto-restore saved sessions
  if (fs.existsSync(WA_SESSION_DIR)) {
    const saved = fs.readdirSync(WA_SESSION_DIR)
      .filter(f => fs.statSync(path.join(WA_SESSION_DIR, f)).isDirectory()
        && !f.startsWith('.')
        && f !== 'default'); // skip the old default session
    if (saved.length > 0) {
      console.log(`🔄 Auto-restaurando ${saved.length} sesión(es): ${saved.join(', ')}`);
      for (const sessionId of saved) {
        startSession(sessionId).catch(e =>
          console.error(`[${sessionId}] Error al auto-restaurar:`, e.message)
        );
      }
    }
  }
});
