const http = require('http');
const fs = require('fs');
const execSync = require('child_process').execSync;

const PORT = 8089;
const QR_PATH = '/tmp/waha_qr_noweb.png';
const API_KEY = 'glamorapp_wa_2026';

function fetchQR() {
  try {
    execSync(`curl -s -H "X-Api-Key: ${API_KEY}" "http://localhost:8081/api/default/auth/qr?format=image" -o ${QR_PATH}`);
  } catch(e) {}
}

http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(`<!DOCTYPE html><html><head><title>Glamorapp QR</title>
<style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#111;color:#fff;font-family:Arial;margin:0}
img{max-width:420px;border:4px solid #EF2D8F;border-radius:16px;padding:20px;background:#fff}
h1{color:#EF2D8F;margin:0 0 10px 0}p{color:#aaa;margin-bottom:20px}
button{margin-top:20px;padding:12px 24px;background:#EF2D8F;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px}</style>
<meta http-equiv="refresh" content="25"></head><body>
<h1>💅 Glamorapp</h1><p>Escanea con WhatsApp → Dispositivos vinculados</p>
<img src="/qr.png?t=${Date.now()}" alt="QR"><br>
<button onclick="location.reload()">🔄 Actualizar QR</button></body></html>`);
  } else if (req.url.startsWith('/qr.png')) {
    fetchQR();
    if (fs.existsSync(QR_PATH)) {
      res.writeHead(200, {'Content-Type': 'image/png'});
      fs.createReadStream(QR_PATH).pipe(res);
    } else {
      res.writeHead(404);
      res.end('QR no disponible aún');
    }
  } else {
    res.writeHead(302, {'Location': '/'});
    res.end();
  }
}).listen(PORT, () => console.log(`QR Viewer: http://localhost:${PORT}`));
