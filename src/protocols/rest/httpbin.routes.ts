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
router.post('/upload/multipart', upload.any() as any, (req: Request, res: Response) => {
  const filesSummary = ((req.files as Express.Multer.File[]) || []).map(f => ({
    fieldname: f.fieldname,
    originalname: f.originalname,
    mimetype: f.mimetype,
    sizeBytes: f.size,
    md5: crypto.createHash('md5').update(f.buffer).digest('hex'),
    sampleBase64: f.buffer.slice(0, 64).toString('base64'),
  }));

  res.json({
    message: 'Multipart upload received successfully',
    fields: req.body,
    files: filesSummary,
    fileCount: filesSummary.length,
  });
});

router.post('/upload/single', upload.single('file') as any, (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded. Send field "file".' });
  }

  res.json({
    message: 'Single file uploaded successfully',
    filename: file.originalname,
    mimetype: file.mimetype,
    sizeBytes: file.size,
    md5: crypto.createHash('md5').update(file.buffer).digest('hex'),
    fields: req.body,
  });
});

// Search, Filtering & Pagination Simulator
router.get('/search', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase();
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
  const sort = String(req.query.sort || 'id:asc');

  const sampleItems = [
    { id: 1, title: 'Cloud Gateway Pro', category: 'networking', price: 299.99, rating: 4.8 },
    { id: 2, title: 'Edge Micro Server', category: 'hardware', price: 499.00, rating: 4.6 },
    { id: 3, title: 'Mesh Router X', category: 'networking', price: 149.50, rating: 4.5 },
    { id: 4, title: 'API Monitoring Agent', category: 'software', price: 79.99, rating: 4.9 },
    { id: 5, title: 'Database Visualizer Suite', category: 'software', price: 120.00, rating: 4.7 },
    { id: 6, title: 'Security Dongle Key', category: 'hardware', price: 45.00, rating: 4.3 },
    { id: 7, title: 'Smart Sensor Hub', category: 'iot', price: 89.00, rating: 4.2 },
    { id: 8, title: 'Ultra Switch 24-Port', category: 'networking', price: 349.99, rating: 4.9 },
    { id: 9, title: 'Load Balancer Appliance', category: 'hardware', price: 899.00, rating: 4.8 },
    { id: 10, title: 'GraphQL Gateway Shield', category: 'software', price: 199.00, rating: 4.9 },
    { id: 11, title: 'Wireless Access Node', category: 'networking', price: 119.00, rating: 4.4 },
    { id: 12, title: 'Telemetry Ingestion Agent', category: 'software', price: 59.99, rating: 4.7 },
  ];

  let filtered = sampleItems;
  if (q) {
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
  }

  const [sortField, sortOrder] = sort.split(':');
  filtered.sort((a: any, b: any) => {
    const valA = a[sortField];
    const valB = b[sortField];
    const dir = sortOrder === 'desc' ? -1 : 1;
    if (valA < valB) return -1 * dir;
    if (valA > valB) return 1 * dir;
    return 0;
  });

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const data = filtered.slice(startIndex, startIndex + limit);

  res.json({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    query: { q, sort, page, limit },
    data,
  });
});

// File Download Streaming (CSV, JSON, SVG, Mock PDF)
router.get('/download/:format', (req: Request, res: Response) => {
  const format = (req.params.format || 'json').toLowerCase();

  switch (format) {
    case 'csv': {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="omnimock_report.csv"');
      const csv = 'id,name,role,status\n1,Alice,Engineer,Active\n2,Bob,Architect,Active\n3,Charlie,Product,Pending\n';
      return res.send(csv);
    }
    case 'svg': {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', 'inline; filename="badge.svg"');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40" viewBox="0 0 200 40">
        <rect width="200" height="40" rx="8" fill="#0284c7"/>
        <text x="100" y="25" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">OmniMock Active</text>
      </svg>`;
      return res.send(svg);
    }
    case 'pdf': {
      // Return a valid minimal PDF binary file
      const minimalPdf = Buffer.from(
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n218\n%%EOF\n',
        'utf-8'
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="omnimock_document.pdf"');
      res.setHeader('Content-Length', minimalPdf.length);
      return res.send(minimalPdf);
    }
    case 'json':
    default: {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="omnimock_data.json"');
      return res.json({
        exportedAt: new Date().toISOString(),
        format: 'json',
        generator: 'OmniMock Protocol Sandbox',
        records: [
          { id: 'REC-001', type: 'REST', verified: true },
          { id: 'REC-002', type: 'GraphQL', verified: true },
          { id: 'REC-003', type: 'gRPC', verified: true },
        ],
      });
    }
  }
});

// Cache Validation (ETag & 304 Not Modified)
router.get('/cache', (req: Request, res: Response) => {
  const content = { message: 'Cacheable response from OmniMock', version: 'v1.4.2', lastUpdated: '2026-09-20' };
  const etag = `"omnimock-${crypto.createHash('md5').update(JSON.stringify(content)).digest('hex').slice(0, 8)}"`;

  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.status(200).json(content);
});

// Rate Limit Simulation
let rateLimitHitCount = 0;
let rateLimitResetTime = Date.now() + 60000;

router.get('/rate-limit', (_req: Request, res: Response) => {
  const now = Date.now();
  if (now > rateLimitResetTime) {
    rateLimitHitCount = 0;
    rateLimitResetTime = now + 60000;
  }

  rateLimitHitCount++;
  const maxLimit = 5;
  const remaining = Math.max(0, maxLimit - rateLimitHitCount);
  const resetSeconds = Math.ceil((rateLimitResetTime - now) / 1000);

  res.setHeader('X-RateLimit-Limit', String(maxLimit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(resetSeconds));

  if (rateLimitHitCount > maxLimit) {
    res.setHeader('Retry-After', String(resetSeconds));
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit quota exceeded. Limit is ${maxLimit} requests/min.`,
      retryAfterSeconds: resetSeconds,
    });
  }

  res.json({
    status: 'success',
    message: `Request allowed. Remaining: ${remaining}/${maxLimit}`,
    quota: { limit: maxLimit, remaining, resetSeconds },
  });
});

export default router;
