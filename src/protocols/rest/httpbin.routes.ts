import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import zlib from 'zlib';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to format standard httpbin response
function formatEchoResponse(req: Request) {
  return {
    url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    args: req.query,
    headers: req.headers,
    origin: req.ip || req.socket.remoteAddress,
    method: req.method,
    cookies: req.cookies || {},
    data: typeof req.body === 'string' ? req.body : undefined,
    json: typeof req.body === 'object' ? req.body : null,
    files: (req as any).files || (req as any).file || null,
  };
}

// HTTP Methods
router.all('/anything*', (req: Request, res: Response) => {
  res.json(formatEchoResponse(req));
});

router.get('/get', (req: Request, res: Response) => {
  res.json(formatEchoResponse(req));
});

router.post('/post', (req: Request, res: Response) => {
  res.json(formatEchoResponse(req));
});

router.put('/put', (req: Request, res: Response) => {
  res.json(formatEchoResponse(req));
});

router.patch('/patch', (req: Request, res: Response) => {
  res.json(formatEchoResponse(req));
});

router.delete('/delete', (req: Request, res: Response) => {
  res.json(formatEchoResponse(req));
});

router.head('/head', (req: Request, res: Response) => {
  res.status(200).end();
});

router.options('/options', (req: Request, res: Response) => {
  res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS');
  res.status(204).end();
});

// Dynamic Status Codes
router.all('/status/:code', (req: Request, res: Response) => {
  const code = parseInt(req.params.code, 10) || 200;
  if (code === 429) {
    res.setHeader('Retry-After', '10');
  }
  if (code >= 300 && code < 400) {
    res.setHeader('Location', '/rest/get');
  }
  res.status(code).json({
    status: code,
    message: `Response with HTTP status ${code}`,
  });
});

// Response delays (0 to 30,000 ms)
router.all('/delay/:ms', (req: Request, res: Response) => {
  const ms = Math.min(Math.max(parseInt(req.params.ms, 10) || 0, 0), 30000);
  setTimeout(() => {
    res.json({
      ...formatEchoResponse(req),
      delay: ms,
    });
  }, ms);
});

// Random Bytes Generator
router.get('/bytes/:n', (req: Request, res: Response) => {
  const n = Math.min(Math.max(parseInt(req.params.n, 10) || 16, 1), 1024 * 1024); // max 1MB
  const buffer = crypto.randomBytes(n);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', n);
  res.send(buffer);
});

// Streaming JSON lines
router.get('/stream/:n', (req: Request, res: Response) => {
  const n = Math.min(Math.max(parseInt(req.params.n, 10) || 10, 1), 100);
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Transfer-Encoding', 'chunked');

  let count = 0;
  const interval = setInterval(() => {
    if (count >= n) {
      clearInterval(interval);
      res.end();
      return;
    }
    const item = {
      id: count,
      url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      timestamp: new Date().toISOString(),
      random: crypto.randomBytes(4).toString('hex'),
    };
    res.write(JSON.stringify(item) + '\n');
    count++;
  }, 100);
});

// Drip (Chunked byte stream over duration)
router.get('/drip', (req: Request, res: Response) => {
  const duration = Math.min(parseInt(req.query.duration as string, 10) || 2, 10);
  const numbytes = Math.min(parseInt(req.query.numbytes as string, 10) || 10, 100);
  const code = parseInt(req.query.code as string, 10) || 200;

  res.status(code);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Transfer-Encoding', 'chunked');

  const intervalMs = (duration * 1000) / numbytes;
  let sent = 0;
  const timer = setInterval(() => {
    if (sent >= numbytes) {
      clearInterval(timer);
      res.end();
      return;
    }
    res.write('*');
    sent++;
  }, intervalMs);
});

// Client inspection
router.get('/headers', (req: Request, res: Response) => {
  res.json({ headers: req.headers });
});

router.get('/ip', (req: Request, res: Response) => {
  res.json({ origin: req.ip || req.socket.remoteAddress });
});

router.get('/user-agent', (req: Request, res: Response) => {
  res.json({ 'user-agent': req.get('user-agent') || 'unknown' });
});

// Cookies
router.get('/cookies', (req: Request, res: Response) => {
  res.json({ cookies: req.cookies || {} });
});

router.get('/cookies/set', (req: Request, res: Response) => {
  for (const [key, value] of Object.entries(req.query)) {
    res.cookie(key, String(value), { httpOnly: false });
  }
  res.redirect('/rest/cookies');
});

router.get('/cookies/delete', (req: Request, res: Response) => {
  for (const key of Object.keys(req.query)) {
    res.clearCookie(key);
  }
  res.redirect('/rest/cookies');
});

// Redirects
router.get('/redirect/:n', (req: Request, res: Response) => {
  const n = parseInt(req.params.n, 10) || 1;
  if (n <= 1) {
    res.redirect('/rest/get');
  } else {
    res.redirect(`/rest/redirect/${n - 1}`);
  }
});

router.get('/redirect-to', (req: Request, res: Response) => {
  const url = (req.query.url as string) || '/rest/get';
  const status = parseInt(req.query.status_code as string, 10) || 302;
  res.redirect(status, url);
});

// Compressions
router.get('/gzip', (req: Request, res: Response) => {
  const payload = JSON.stringify({ gzipped: true, ...formatEchoResponse(req) });
  zlib.gzip(payload, (err, buffer) => {
    if (err) return res.status(500).send('Compression error');
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Type', 'application/json');
    res.send(buffer);
  });
});

router.get('/deflate', (req: Request, res: Response) => {
  const payload = JSON.stringify({ deflated: true, ...formatEchoResponse(req) });
  zlib.deflate(payload, (err, buffer) => {
    if (err) return res.status(500).send('Compression error');
    res.setHeader('Content-Encoding', 'deflate');
    res.setHeader('Content-Type', 'application/json');
    res.send(buffer);
  });
});

router.get('/brotli', (req: Request, res: Response) => {
  const payload = JSON.stringify({ brotli: true, ...formatEchoResponse(req) });
  zlib.brotliCompress(payload, (err, buffer) => {
    if (err) return res.status(500).send('Compression error');
    res.setHeader('Content-Encoding', 'br');
    res.setHeader('Content-Type', 'application/json');
    res.send(buffer);
  });
});

// File Uploads
router.post('/upload/multipart', upload.any(), (req: Request, res: Response) => {
  const filesSummary = ((req.files as Express.Multer.File[]) || []).map(f => ({
    fieldname: f.fieldname,
    originalname: f.originalname,
    mimetype: f.mimetype,
    sizeBytes: f.size,
    sampleBase64: f.buffer.slice(0, 64).toString('base64'),
  }));

  res.json({
    message: 'Multipart upload received successfully',
    fields: req.body,
    files: filesSummary,
    fileCount: filesSummary.length,
  });
});

export default router;
