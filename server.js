const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

let totalCookies = 0;

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', total: totalCookies, users: wss.clients.size }));
  broadcast({ type: 'users', users: wss.clients.size });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'click' && typeof msg.amount === 'number' && msg.amount > 0) {
        // cap per-click to prevent cheating
        const capped = Math.min(msg.amount, 10000);
        totalCookies += capped;
        broadcast({ type: 'update', total: totalCookies, delta: capped });
      }
    } catch {}
  });

  ws.on('close', () => {
    broadcast({ type: 'users', users: wss.clients.size });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`running on :${PORT}`));
