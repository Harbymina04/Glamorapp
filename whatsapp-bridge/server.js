const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8082;
const API_KEY = process.env.API_KEY || 'glamorapp_wa_2026';
const QR_PATH = '/tmp/waha_qr.png';

// Auth middleware
function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Create WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '/tmp/wa-session' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  },
});

let qrCode = null;
let ready = false;

client.on('qr', async (qr) => {
  console.log('📱 QR Code received! Save to', QR_PATH);
  qrCode = qr;
  
  // Generate QR as PNG
  try {
    await QRCode.toFile(QR_PATH, qr, { 
      type: 'png', 
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    console.log('✅ QR saved to', QR_PATH);
  } catch (e) {
    console.error('QR save error:', e.message);
  }
});

client.on('authenticated', () => {
  console.log('🔐 Authenticated!');
});

client.on('ready', () => {
  ready = true;
  console.log('✅ WhatsApp client is ready!');
  // Clean QR file
  try { fs.unlinkSync(QR_PATH); } catch(e) {}
});

client.on('disconnected', (reason) => {
  ready = false;
  console.log('❌ Disconnected:', reason);
});

// REST API
app.get('/api/status', auth, (req, res) => {
  res.json({ 
    status: ready ? 'connected' : (qrCode ? 'qr_pending' : 'initializing'),
    ready,
  });
});

app.get('/api/qr', auth, (req, res) => {
  if (ready) return res.json({ status: 'already_connected' });
  if (!qrCode) return res.status(404).json({ error: 'QR not yet generated' });
  
  if (req.query.format === 'image') {
    if (fs.existsSync(QR_PATH)) {
      return res.sendFile(QR_PATH);
    }
    return res.status(404).json({ error: 'QR image not found' });
  }
  
  res.json({ qr: qrCode, format: 'raw' });
});

app.post('/api/sendText', auth, async (req, res) => {
  if (!ready) return res.status(503).json({ error: 'WhatsApp not connected' });
  
  const { chatId, text } = req.body;
  if (!chatId || !text) return res.status(400).json({ error: 'chatId and text required' });
  
  try {
    const msg = await client.sendMessage(chatId, text);
    res.json({ success: true, id: msg.id._serialized });
  } catch (e) {
    console.error('Send error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Bridge API on port ${PORT}`);
  console.log(`🔑 API Key: ${API_KEY}`);
});

client.initialize().catch(e => console.error('Init error:', e));
