import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { auditService } from '../../audit/audit.service';

const router = Router();

interface WebhookRequestRecord {
  id: string;
  inboxId: string;
  timestamp: string;
  method: string;
  headers: Record<string, any>;
  query: Record<string, any>;
  body: any;
  clientIp?: string;
}

const webhookInboxes = new Map<string, WebhookRequestRecord[]>();

// 1. Create a new Webhook Inbox
router.post('/inboxes', (_req: Request, res: Response) => {
  const inboxId = uuidv4().slice(0, 8);
  webhookInboxes.set(inboxId, []);
  res.json({
    inboxId,
    webhookUrl: `/webhooks/inbox/${inboxId}`,
    message: `Send any HTTP requests to /webhooks/inbox/${inboxId} to capture payloads.`,
  });
});

// 2. Receive Webhook on Inbox
router.all('/inbox/:inboxId', (req: Request, res: Response) => {
  const { inboxId } = req.params;
  if (!webhookInboxes.has(inboxId)) {
    webhookInboxes.set(inboxId, []);
  }

  const record: WebhookRequestRecord = {
    id: uuidv4(),
    inboxId,
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body,
    clientIp: req.ip || req.socket.remoteAddress,
  };

  const inbox = webhookInboxes.get(inboxId)!;
  inbox.unshift(record);
  if (inbox.length > 100) inbox.pop(); // keep last 100

  auditService.record({
    protocol: 'WEBHOOK',
    method: req.method,
    path: `/webhooks/inbox/${inboxId}`,
    clientIp: record.clientIp,
    headers: req.headers,
    requestBody: req.body,
    responseStatus: 200,
    metadata: { inboxId, webhookRecordId: record.id },
  });

  res.status(200).json({
    received: true,
    inboxId,
    recordId: record.id,
    timestamp: record.timestamp,
  });
});

// 3. Inspect Captured Webhook Requests
router.get('/inbox/:inboxId/requests', (req: Request, res: Response) => {
  const { inboxId } = req.params;
  const requests = webhookInboxes.get(inboxId) || [];
  res.json({
    inboxId,
    total: requests.length,
    requests,
  });
});

// 4. Clear Webhook Inbox
router.delete('/inbox/:inboxId', (req: Request, res: Response) => {
  const { inboxId } = req.params;
  webhookInboxes.delete(inboxId);
  res.json({ message: `Inbox ${inboxId} cleared.` });
});

// 5. Outbound Webhook Dispatcher
router.post('/dispatch', (req: Request, res: Response) => {
  const { targetUrl, payload, secret, headers = {} } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing targetUrl' });
  }

  const bodyData = typeof payload === 'string' ? payload : JSON.stringify(payload || { event: 'ping', timestamp: Date.now() });
  const outboundHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'OmniMock-Webhook-Dispatcher/1.0',
    ...headers,
  };

  if (secret) {
    const signature = crypto.createHmac('sha256', secret).update(bodyData).digest('hex');
    outboundHeaders['X-Hub-Signature-256'] = `sha256=${signature}`;
  }

  try {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;

    const request = client.request(
      targetUrl,
      {
        method: 'POST',
        headers: outboundHeaders,
      },
      response => {
        let respBody = '';
        response.on('data', chunk => (respBody += chunk));
        response.on('end', () => {
          res.json({
            dispatched: true,
            targetUrl,
            responseStatus: response.statusCode,
            responseHeaders: response.headers,
            responseBody: respBody,
          });
        });
      }
    );

    request.on('error', err => {
      res.status(502).json({
        dispatched: false,
        error: err.message,
      });
    });

    request.write(bodyData);
    request.end();
  } catch (err: any) {
    res.status(400).json({ error: 'Invalid URL', message: err.message });
  }
});

export default router;
