import { Router, Request, Response } from 'express';
import { auditService, ProtocolType } from './audit.service';

const router = Router();

// Query audit logs
router.get('/logs', (req: Request, res: Response) => {
  const protocol = req.query.protocol as ProtocolType | undefined;
  const search = req.query.search as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  const results = auditService.getLogs({ protocol, search, limit, offset });
  res.json(results);
});

// Single log by ID
router.get('/logs/:id', (req: Request, res: Response) => {
  const log = auditService.getLogById(req.params.id);
  if (!log) return res.status(404).json({ error: 'Audit log not found' });
  res.json(log);
});

// SSE Stream of live audit logs
router.get('/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const listener = (newLog: any) => {
    res.write(`data: ${JSON.stringify(newLog)}\n\n`);
  };

  auditService.on('new_log', listener);

  req.on('close', () => {
    auditService.removeListener('new_log', listener);
  });
});

// Clear logs
router.delete('/logs', (_req: Request, res: Response) => {
  auditService.clearLogs();
  res.json({ message: 'Audit logs cleared' });
});

export default router;
