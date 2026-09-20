import { Router, Request, Response, NextFunction } from 'express';
import { mockRuleEngine } from './mocks.service';

const router = Router();

// CRUD API for Mock Rules
router.get('/', (_req: Request, res: Response) => {
  res.json({
    total: mockRuleEngine.getRules().length,
    rules: mockRuleEngine.getRules(),
  });
});

router.post('/', (req: Request, res: Response) => {
  const { name, method, path, statusCode, responseHeaders, responseBody, delayMs, enabled } = req.body;

  if (!name || !path) {
    return res.status(400).json({ error: 'Missing required fields: name, path' });
  }

  const rule = mockRuleEngine.addRule({
    name,
    method: method || 'GET',
    path,
    statusCode: statusCode || 200,
    responseHeaders: responseHeaders || { 'Content-Type': 'application/json' },
    responseBody: responseBody !== undefined ? responseBody : { status: 'ok' },
    delayMs: delayMs || 0,
    enabled: enabled !== false,
  });

  res.status(201).json({ message: 'Custom mock rule created', rule });
});

router.put('/:id', (req: Request, res: Response) => {
  const rule = mockRuleEngine.updateRule(req.params.id, req.body);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json({ message: 'Rule updated', rule });
});

router.delete('/:id', (req: Request, res: Response) => {
  const deleted = mockRuleEngine.deleteRule(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Rule not found' });
  res.json({ message: 'Rule deleted' });
});

// Middleware to intercept requests matching custom rules
export function customMockInterceptor(req: Request, res: Response, next: NextFunction) {
  const matched = mockRuleEngine.matchRule(req.method, req.path);
  if (matched) {
    matched.hitCount++;

    const sendResponse = () => {
      if (matched.responseHeaders) {
        for (const [k, v] of Object.entries(matched.responseHeaders)) {
          res.setHeader(k, v);
        }
      }
      res.status(matched.statusCode);

      const evaluated = mockRuleEngine.evaluateTemplate(matched.responseBody);
      if (typeof evaluated === 'string') {
        res.send(evaluated);
      } else {
        res.json(evaluated);
      }
    };

    if (matched.delayMs && matched.delayMs > 0) {
      return setTimeout(sendResponse, matched.delayMs);
    }
    return sendResponse();
  }
  next();
}

export default router;
