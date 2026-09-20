import { Request, Response, NextFunction } from 'express';

export interface ChaosConfig {
  enabled: boolean;
  globalDelayMs: number;
  globalErrorRate: number; // 0 to 100%
  globalStatusCode: number;
  corruptResponse: boolean;
}

export const chaosConfig: ChaosConfig = {
  enabled: false,
  globalDelayMs: 0,
  globalErrorRate: 0,
  globalStatusCode: 500,
  corruptResponse: false,
};

export function chaosMiddleware(req: Request, res: Response, next: NextFunction) {
  // Don't apply chaos to chaos config or UI itself
  if (req.path.startsWith('/chaos') || req.path.startsWith('/ui') || req.path === '/' || req.path.startsWith('/audit')) {
    return next();
  }

  // 1. Header-based Chaos: Drop Rate (abrupt socket termination)
  const headerDropRate = req.headers['x-chaos-drop-rate'] ? parseInt(req.headers['x-chaos-drop-rate'] as string, 10) : 0;
  if (headerDropRate > 0 && Math.random() * 100 < headerDropRate) {
    req.socket.destroy();
    return;
  }

  // 2. Header-based Chaos: Status Code override
  const headerStatus = req.headers['x-chaos-status'] ? parseInt(req.headers['x-chaos-status'] as string, 10) : null;
  if (headerStatus) {
    if (headerStatus === 429) res.setHeader('Retry-After', '30');
    return res.status(headerStatus).json({
      error: 'Chaos Injected Error',
      injectedStatusCode: headerStatus,
      message: `Triggered by X-Chaos-Status: ${headerStatus}`,
    });
  }

  // 3. Header-based Chaos: Corrupt Response
  const headerCorrupt = req.headers['x-chaos-corrupt'] === 'true';
  if (headerCorrupt) {
    res.setHeader('Content-Type', 'application/json');
    res.status(200);
    res.end('{"error": "corrupted_json", "data": [incomplete_data_stream...,');
    return;
  }

  // 4. Global Chaos Config Rules
  if (chaosConfig.enabled) {
    if (chaosConfig.globalErrorRate > 0 && Math.random() * 100 < chaosConfig.globalErrorRate) {
      return res.status(chaosConfig.globalStatusCode).json({
        error: 'Global Chaos Error',
        statusCode: chaosConfig.globalStatusCode,
        message: 'Triggered by active global chaos engineering configuration',
      });
    }
  }

  // 5. Header-based or Global Delay
  const headerDelay = req.headers['x-chaos-delay'] ? parseInt(req.headers['x-chaos-delay'] as string, 10) : 0;
  const delayMs = headerDelay > 0 ? headerDelay : (chaosConfig.enabled ? chaosConfig.globalDelayMs : 0);

  if (delayMs > 0) {
    setTimeout(next, delayMs);
  } else {
    next();
  }
}
