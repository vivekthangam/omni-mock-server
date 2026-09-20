import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { auditService } from '../../audit/audit.service';

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  const chatClients = new Set<WebSocket>();
  const auditClients = new Set<WebSocket>();

  // Subscribe to live audit service logs and broadcast to connected audit UI clients
  auditService.on('new_log', log => {
    const payload = JSON.stringify({ type: 'AUDIT_LOG', log });
    for (const client of auditClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '/', `http://${request.headers.host}`);

    if (pathname.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const { pathname } = new URL(req.url || '/', `http://${req.headers.host}`);

    // Route: /ws/audit (Live Audit Stream)
    if (pathname === '/ws/audit') {
      auditClients.add(ws);
      ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Subscribed to live audit logs' }));
      ws.on('close', () => auditClients.delete(ws));
      return;
    }

    // Route: /ws/echo (Echo server)
    if (pathname === '/ws/echo') {
      ws.send(JSON.stringify({ message: 'Connected to OmniMock WebSocket Echo Server' }));
      ws.on('message', (data, isBinary) => {
        auditService.record({
          protocol: 'WEBSOCKET',
          method: isBinary ? 'BINARY_FRAME' : 'TEXT_FRAME',
          path: '/ws/echo',
          requestBody: isBinary ? `[Binary Data: ${data.toString('base64').slice(0, 32)}...]` : data.toString(),
        });

        // Echo back
        ws.send(data, { binary: isBinary });
      });
      return;
    }

    // Route: /ws/ticker (Realtime Ticker)
    if (pathname === '/ws/ticker') {
      ws.send(JSON.stringify({ type: 'INFO', message: 'Subscribed to Live Ticker' }));
      let price = 50000;
      const interval = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          clearInterval(interval);
          return;
        }
        price += (Math.random() - 0.5) * 100;
        ws.send(
          JSON.stringify({
            symbol: 'BTC-USD',
            price: parseFloat(price.toFixed(2)),
            timestamp: new Date().toISOString(),
          })
        );
      }, 1000);

      ws.on('close', () => clearInterval(interval));
      return;
    }

    // Route: /ws/chat (Broadcast Room)
    if (pathname === '/ws/chat') {
      chatClients.add(ws);
      ws.send(JSON.stringify({ type: 'SYSTEM', message: 'Welcome to Chat Room. Send JSON { "sender": "Alice", "text": "Hello" }' }));

      ws.on('message', data => {
        let parsed: any;
        try {
          parsed = JSON.parse(data.toString());
        } catch {
          parsed = { sender: 'Anonymous', text: data.toString() };
        }

        const broadcastPayload = JSON.stringify({
          type: 'CHAT_MESSAGE',
          sender: parsed.sender || 'Anonymous',
          text: parsed.text || '',
          timestamp: new Date().toISOString(),
        });

        for (const client of chatClients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastPayload);
          }
        }
      });

      ws.on('close', () => chatClients.delete(ws));
      return;
    }

    // Route: /ws/crypto (Multi-Asset Market Stream)
    if (pathname === '/ws/crypto') {
      ws.send(JSON.stringify({ type: 'SUBSCRIBED', channel: 'crypto-markets', assets: ['BTC', 'ETH', 'SOL'] }));
      const assets = [
        { symbol: 'BTC/USD', base: 64250.0 },
        { symbol: 'ETH/USD', base: 3450.0 },
        { symbol: 'SOL/USD', base: 145.2 },
      ];

      const interval = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          clearInterval(interval);
          return;
        }
        const asset = assets[Math.floor(Math.random() * assets.length)];
        const delta = (Math.random() - 0.49) * (asset.base * 0.008);
        asset.base = parseFloat((asset.base + delta).toFixed(2));

        ws.send(JSON.stringify({
          type: 'MARKET_TICK',
          symbol: asset.symbol,
          price: asset.base,
          change24h: parseFloat((Math.random() * 5 - 2).toFixed(2)),
          volume24h: Math.floor(Math.random() * 1000000) + 500000,
          timestamp: new Date().toISOString(),
        }));
      }, 750);

      ws.on('close', () => clearInterval(interval));
      return;
    }

    // Route: /ws/ping (Ping / Pong Latency measurement)
    if (pathname === '/ws/ping') {
      ws.send(JSON.stringify({ type: 'READY', message: 'Send { "type": "ping", "clientTime": 1234567890 }' }));
      ws.on('message', data => {
        try {
          const parsed = JSON.parse(data.toString());
          ws.send(JSON.stringify({
            type: 'PONG',
            clientTime: parsed.clientTime,
            serverTime: Date.now(),
            echo: parsed,
          }));
        } catch {
          ws.send(JSON.stringify({ type: 'PONG', serverTime: Date.now() }));
        }
      });
      return;
    }

    // Default fallback
    ws.send(JSON.stringify({ message: `Connected to WebSocket endpoint: ${pathname}` }));
  });
}
