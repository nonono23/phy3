const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const LOG_FILE = path.join(__dirname, 'all_logs.csv');

// Get Local IP addresses for display
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// Ensure log file has a header if it doesn't exist
if (!fs.existsSync(LOG_FILE)) {
  const BOM = '\uFEFF';
  const header = 'タイムスタンプ,ユーザーネーム,問題番号,アクション種別,入力初速(m/s),詳細\n';
  fs.writeFileSync(LOG_FILE, BOM + header, 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.csv': 'text/csv'
};

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  if (req.method === 'POST' && req.url === '/api/log') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // Sanitize helper
        function esc(v) {
          const s = String(v || '');
          return (s.indexOf(',') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('"') >= 0)
            ? '"' + s.replace(/"/g, '""') + '"' : s;
        }

        const row = [
          esc(data.timestamp),
          esc(data.username),
          esc(data.problem),
          esc(data.action),
          esc(data.v0),
          esc(data.detail)
        ].join(',') + '\n';

        fs.appendFile(LOG_FILE, row, 'utf8', (err) => {
          if (err) {
            console.error('Failed to append log:', err);
            res.writeHead(500);
            res.end('Server Error');
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
          }
        });
      } catch (err) {
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/download_logs') {
    fs.readFile(LOG_FILE, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Logs not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="all_logs.csv"'
      });
      res.end(data);
    });
    return;
  }

  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  // Remove query params if any
  filePath = filePath.split('?')[0];
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  const absolutePath = path.join(__dirname, filePath);
  
  fs.readFile(absolutePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log(`\n===========================================`);
  console.log(`🚀 PhyGame Server is running!`);
  console.log(`👉 Access locally: http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`👉 Access from network: http://${ip}:${PORT}`);
  });
  console.log(`===========================================\n`);
});
