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

export default router;
