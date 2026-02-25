const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("WebSocket signaling server is running");
});

const wss = new WebSocket.Server({ server });

const peers = new Map();

wss.on('connection', (ws) => {
  let peerId = null;
  console.log("New connection");

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'register') {
        peerId = msg.id;
        peers.set(peerId, { ws, name: msg.name });
        broadcastPeerList();
      }

      if (msg.type === 'signal') {
        const target = peers.get(msg.target);
        if (target && target.ws.readyState === WebSocket.OPEN) {
          target.ws.send(JSON.stringify({
            type: 'signal',
            from: peerId,
            data: msg.data
          }));
        }
      }

    } catch (err) {
      console.error("Message error:", err.message);
    }
  });

  ws.on('close', () => {
    if (peerId) {
      peers.delete(peerId);
      broadcastPeerList();
    }
  });
});

function broadcastPeerList() {
  const peerList = Array.from(peers.entries()).map(([id, info]) => ({
    id,
    name: info.name
  }));

  const message = JSON.stringify({
    type: 'peers',
    peers: peerList
  });

  peers.forEach(({ ws }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log("Server running on port", PORT);
});