import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config';

const router = Router();

// -------------------------------------------------------------
// 1. Basic Auth
// -------------------------------------------------------------
router.get('/basic/:username/:password', (req: Request, res: Response) => {
  const { username, password } = req.params;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="OmniMock Basic Realm"');
    return res.status(401).json({ error: 'Unauthorized', message: 'Basic authentication required' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [user, pass] = credentials.split(':');

  if (user === username && pass === password) {
    return res.json({
      authenticated: true,
      user,
      authType: 'Basic',
      message: 'Successfully authenticated with HTTP Basic Auth',
    });
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="OmniMock Basic Realm"');
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid username or password' });
});

// Default basic auth (user: "admin", pass: "password")
router.get('/basic', (req: Request, res: Response) => {
  req.params.username = 'admin';
  req.params.password = 'password';
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="OmniMock Basic Realm"');
    return res.status(401).json({ error: 'Unauthorized', message: 'Send Basic Auth with admin:password' });
  }
  const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64').toString('ascii').split(':');
  if (user === 'admin' && pass === 'password') {
    return res.json({ authenticated: true, user, authType: 'Basic' });
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="OmniMock Basic Realm"');
  res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials. Expected admin:password' });
});

// -------------------------------------------------------------
// 2. Digest Auth
// -------------------------------------------------------------
const activeNonces = new Set<string>();

router.get('/digest/:qop/:user/:passwd', (req: Request, res: Response) => {
  const { qop, user, passwd } = req.params;
  const authHeader = req.headers.authorization;
  const realm = 'OmniMock Digest Realm';

  if (!authHeader || !authHeader.startsWith('Digest ')) {
    const nonce = crypto.randomBytes(16).toString('hex');
    activeNonces.add(nonce);
    res.setHeader(
      'WWW-Authenticate',
      `Digest realm="${realm}", qop="${qop}", nonce="${nonce}", opaque="${crypto.randomBytes(8).toString('hex')}"`
    );
    return res.status(401).json({ error: 'Unauthorized', message: 'Digest auth challenge issued' });
  }

  // Parse Digest headers
  const authParams: Record<string, string> = {};
  const matches = authHeader.replace(/^Digest\s+/, '').match(/(\w+)=("[^"]*"|[^,]*)/g) || [];
  for (const match of matches) {
    const [k, v] = match.split('=');
    authParams[k.trim()] = v.replace(/^"|"$/g, '').trim();
  }

  const { username, nonce, response: clientResponse, uri, nc, cnonce } = authParams;

  if (username !== user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Digest username mismatch' });
  }

  // Calculate expected response
  const ha1 = crypto.createHash('md5').update(`${user}:${realm}:${passwd}`).digest('hex');
  const ha2 = crypto.createHash('md5').update(`${req.method}:${uri || req.originalUrl}`).digest('hex');
  let expectedResponse: string;

  if (qop === 'auth' && nc && cnonce) {
    expectedResponse = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');
  } else {
    expectedResponse = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
  }

  if (clientResponse === expectedResponse) {
    return res.json({
      authenticated: true,
      user,
      authType: 'Digest',
      message: 'Successfully authenticated with HTTP Digest Auth',
    });
  }

  res.status(401).json({ error: 'Unauthorized', message: 'Digest response hash mismatch' });
});

// -------------------------------------------------------------
// 3. Bearer Token & JWT
// -------------------------------------------------------------
router.post('/jwt/token', (req: Request, res: Response) => {
  const payload = req.body || {
    sub: 'user_12345',
    name: 'Alice Developer',
    email: 'alice@example.com',
    role: 'admin',
    scopes: ['read', 'write', 'admin'],
  };
  const expiresIn = req.query.expiresIn ? String(req.query.expiresIn) : '1h';

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: expiresIn as any });
  res.json({
    token_type: 'Bearer',
    access_token: token,
    expires_in: 3600,
    payload,
  });
});

router.post('/jwt/expired', (_req: Request, res: Response) => {
  // Token that expired 1 hour ago
  const payload = { sub: 'user_expired', name: 'Expired User', iat: Math.floor(Date.now() / 1000) - 7200 };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: -3600 });
  res.json({
    token_type: 'Bearer',
    access_token: token,
    description: 'This token is already expired for client error testing.',
  });
});

router.get('/jwt/protected', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Bearer token missing in Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    res.json({
      authenticated: true,
      authType: 'Bearer JWT',
      user: decoded,
      message: 'JWT Token successfully validated',
    });
  } catch (err: any) {
    res.status(401).json({
      error: 'Invalid Token',
      name: err.name,
      message: err.message,
    });
  }
});

// -------------------------------------------------------------
// 4. API Key (Header / Query / Cookie)
// -------------------------------------------------------------
const EXPECTED_API_KEY = 'omnimock_secret_api_key_xyz987';

router.all('/apikey/header', (req: Request, res: Response) => {
  const apiKey = req.headers['x-api-key'] || req.headers['api-key'];
  if (apiKey === EXPECTED_API_KEY) {
    return res.json({ authenticated: true, authType: 'API Key (Header)', keyProvided: apiKey });
  }
  res.status(403).json({ error: 'Forbidden', message: `Missing or invalid X-API-Key header. Expected '${EXPECTED_API_KEY}'` });
});

router.all('/apikey/query', (req: Request, res: Response) => {
  const apiKey = req.query.api_key || req.query.apiKey;
  if (apiKey === EXPECTED_API_KEY) {
    return res.json({ authenticated: true, authType: 'API Key (Query Param)', keyProvided: apiKey });
  }
  res.status(403).json({ error: 'Forbidden', message: `Missing or invalid api_key query param. Expected '${EXPECTED_API_KEY}'` });
});

router.all('/apikey/cookie', (req: Request, res: Response) => {
  const apiKey = req.cookies?.api_key || req.cookies?.apiKey;
  if (apiKey === EXPECTED_API_KEY) {
    return res.json({ authenticated: true, authType: 'API Key (Cookie)', keyProvided: apiKey });
  }
  res.status(403).json({ error: 'Forbidden', message: `Missing or invalid api_key cookie. Expected '${EXPECTED_API_KEY}'` });
});

// -------------------------------------------------------------
// 5. HMAC & AWS SigV4 Simulation
// -------------------------------------------------------------
router.all('/hmac', (req: Request, res: Response) => {
  const signature = req.headers['x-signature'] || req.headers['x-hub-signature-256'];
  const secret = 'omnimock_shared_hmac_secret';
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || '');

  const expectedSig = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (!signature) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-Signature or X-Hub-Signature-256 header',
      hint: `HMAC SHA256 of body with secret '${secret}'`,
      expectedSignature: expectedSig,
    });
  }

  if (signature === expectedSig || signature === expectedSig.replace('sha256=', '')) {
    return res.json({ authenticated: true, authType: 'HMAC-SHA256', signature });
  }

  res.status(401).json({ error: 'Invalid Signature', provided: signature, expected: expectedSig });
});

router.all('/aws-sigv4', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('AWS4-HMAC-SHA256')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing AWS4-HMAC-SHA256 Authorization header',
      sampleHeader: 'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20260919/us-east-1/execute-api/aws4_request, SignedHeaders=host;x-amz-date, Signature=...',
    });
  }
  res.json({
    authenticated: true,
    authType: 'AWS Signature Version 4',
    authorizationHeader: authHeader,
    amzDate: req.headers['x-amz-date'],
  });
});

export default router;
