import { Router, Request, Response } from 'express';
import { chaosConfig } from './chaos.service';

const router = Router();

// Get active chaos settings
router.get('/config', (_req: Request, res: Response) => {
  res.json({
    activeConfig: chaosConfig,
    headerTriggers: {
      'X-Chaos-Delay': 'Inject latency in milliseconds (e.g. 2000)',
      'X-Chaos-Status': 'Force specific HTTP status code (e.g. 500, 502, 503, 429)',
      'X-Chaos-Drop-Rate': 'Probability percentage (0-100) of abruptly killing TCP connection',
      'X-Chaos-Corrupt': 'Set to "true" to receive malformed/truncated JSON payload',
    },
  });
});

// Update global chaos settings
router.post('/config', (req: Request, res: Response) => {
  const { enabled, globalDelayMs, globalErrorRate, globalStatusCode, corruptResponse } = req.body;

  if (enabled !== undefined) chaosConfig.enabled = Boolean(enabled);
  if (globalDelayMs !== undefined) chaosConfig.globalDelayMs = Math.max(0, parseInt(globalDelayMs, 10));
  if (globalErrorRate !== undefined) chaosConfig.globalErrorRate = Math.min(100, Math.max(0, parseInt(globalErrorRate, 10)));
  if (globalStatusCode !== undefined) chaosConfig.globalStatusCode = parseInt(globalStatusCode, 10);
  if (corruptResponse !== undefined) chaosConfig.corruptResponse = Boolean(corruptResponse);

  res.json({
    message: 'Chaos configuration updated successfully',
    chaosConfig,
  });
});

export default router;
