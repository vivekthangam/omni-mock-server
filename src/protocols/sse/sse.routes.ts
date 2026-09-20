import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

// Generic SSE stream
router.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const intervalMs = Math.min(Math.max(parseInt(req.query.interval as string, 10) || 1000, 100), 10000);
  const maxEvents = parseInt(req.query.count as string, 10) || 50;

  // Set retry interval for client reconnection
  res.write('retry: 3000\n\n');

  let count = 0;
  const timer = setInterval(() => {
    count++;
    const data = {
      id: count,
      timestamp: new Date().toISOString(),
      message: `Event #${count} from OmniMock SSE service`,
      random: crypto.randomBytes(4).toString('hex'),
    };

    const eventName = count % 5 === 0 ? 'milestone' : 'message';
    res.write(`event: ${eventName}\n`);
    res.write(`id: ${count}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);

    if (count >= maxEvents) {
      res.write('event: done\ndata: {"status":"complete"}\n\n');
      clearInterval(timer);
      res.end();
    }
  }, intervalMs);

  req.on('close', () => {
    clearInterval(timer);
  });
});

// Live Stock Ticker SSE
router.get('/stocks', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'BTC-USD'];
  const prices: Record<string, number> = {
    AAPL: 185.5,
    GOOGL: 172.3,
    MSFT: 420.1,
    AMZN: 180.4,
    TSLA: 245.8,
    NVDA: 120.6,
    'BTC-USD': 65000.0,
  };

  const timer = setInterval(() => {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const delta = (Math.random() - 0.48) * (prices[symbol] * 0.02);
    prices[symbol] = parseFloat((prices[symbol] + delta).toFixed(2));

    const payload = {
      symbol,
      price: prices[symbol],
      change: parseFloat(delta.toFixed(2)),
      timestamp: new Date().toISOString(),
    };

    res.write('event: trade\n');
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }, 800);

  req.on('close', () => {
    clearInterval(timer);
  });
});

// Notifications & System Alerts SSE
router.get('/notifications', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write('retry: 5000\n\n');

  const alerts = [
    { type: 'INFO', title: 'Backup Completed', detail: 'Database backup snapshot created in AWS S3' },
    { type: 'WARNING', title: 'High Memory Pressure', detail: 'Worker node 3 heap reached 82%' },
    { type: 'SECURITY', title: 'New Device Login', detail: 'Admin login detected from 192.168.1.100' },
    { type: 'SUCCESS', title: 'Deployment Live', detail: 'OmniMock release v1.4.2 promoted to prod' },
  ];

  let id = 0;
  const timer = setInterval(() => {
    id++;
    const alert = alerts[Math.floor(Math.random() * alerts.length)];
    const payload = {
      id: `alert_${id}`,
      ...alert,
      timestamp: new Date().toISOString(),
    };

    res.write('event: notification\n');
    res.write(`id: ${id}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }, 2000);

  req.on('close', () => {
    clearInterval(timer);
  });
});

// Finite Build Logs Progress Stream
router.get('/build-logs', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const steps = [
    'Initializing build environment in runner-us-east-1a...',
    'Cloning git repository vivekthangam/omni-mock-server (main)...',
    'Resolving pnpm dependencies from store cache...',
    'Compiling TypeScript modules (tsc --project tsconfig.json)...',
    'Running multi-protocol integration test matrix...',
    'Packaging Docker container image omnimock:latest...',
    'Publishing artifact manifest to cloud registry...',
    'Build and verification completed successfully (0 errors, 14 suites passed).',
  ];

  let current = 0;
  const timer = setInterval(() => {
    if (current >= steps.length) {
      res.write('event: build-complete\n');
      res.write(`data: ${JSON.stringify({ status: 'SUCCESS', exitCode: 0, durationSec: 8 })}\n\n`);
      clearInterval(timer);
      res.end();
      return;
    }

    const payload = {
      step: current + 1,
      totalSteps: steps.length,
      log: steps[current],
      timestamp: new Date().toISOString(),
    };

    res.write('event: log\n');
    res.write(`id: ${current + 1}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    current++;
  }, 1000);

  req.on('close', () => {
    clearInterval(timer);
  });
});

export default router;
