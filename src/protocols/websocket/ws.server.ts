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

    // Default fallback
    ws.send(JSON.stringify({ message: `Connected to WebSocket endpoint: ${pathname}` }));
  });
}
