import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../../config';

const router = Router();

interface AuthCodeData {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
  user: any;
  expiresAt: number;
}

const authCodes = new Map<string, AuthCodeData>();
const refreshTokens = new Map<string, any>();

// PKCE verification helper
function verifyPkce(codeVerifier: string, codeChallenge: string, method?: string): boolean {
  if (!codeChallenge) return true;
  if (method === 'S256') {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return hash === codeChallenge;
  }
  // Plain method
  return codeVerifier === codeChallenge;
}

// -------------------------------------------------------------
// 1. OIDC Discovery Document
// -------------------------------------------------------------
router.get(['/.well-known/openid-configuration', '/openid-configuration'], (req: Request, res: Response) => {
  const host = `${req.protocol}://${req.get('host')}`;
  res.json({
    issuer: `${host}/oauth`,
    authorization_endpoint: `${host}/oauth/authorize`,
    token_endpoint: `${host}/oauth/token`,
    userinfo_endpoint: `${host}/oauth/userinfo`,
    jwks_uri: `${host}/oauth/jwks.json`,
    introspection_endpoint: `${host}/oauth/introspect`,
    revocation_endpoint: `${host}/oauth/revoke`,
    response_types_supported: ['code', 'token', 'id_token', 'code token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256', 'RS256'],
    scopes_supported: ['openid', 'profile', 'email', 'offline_access', 'read', 'write'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    code_challenge_methods_supported: ['S256', 'plain'],
    grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token', 'password', 'implicit'],
  });
});

// -------------------------------------------------------------
// 2. JWKS Endpoint
// -------------------------------------------------------------
router.get('/jwks.json', (_req: Request, res: Response) => {
  res.json({
    keys: [
      {
        kty: 'oct',
        alg: 'HS256',
        use: 'sig',
        kid: 'omnimock-hs256-key-1',
      }
    ],
  });
});

// -------------------------------------------------------------
// 3. OAuth 2.0 Authorize Endpoint
// -------------------------------------------------------------
router.get('/authorize', (req: Request, res: Response) => {
  const {
    response_type,
    client_id,
    redirect_uri,
    scope,
    state,
    code_challenge,
    code_challenge_method,
    auto_approve,
  } = req.query as Record<string, string>;

  if (!client_id || !redirect_uri) {
    return res.status(400).send('Missing client_id or redirect_uri');
  }

  // If auto_approve or JSON accept requested
  if (auto_approve === 'true' || req.query.format === 'json') {
    if (response_type === 'token') {
      // Implicit flow
      const token = jwt.sign(
        { sub: 'oauth_user_1', client_id, scope: scope || 'openid profile' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
      const targetUrl = new URL(redirect_uri);
      targetUrl.hash = `access_token=${token}&token_type=Bearer&expires_in=3600&state=${encodeURIComponent(state || '')}`;
      return res.redirect(targetUrl.toString());
    }

    // Authorization code flow
    const code = `code_${crypto.randomBytes(16).toString('hex')}`;
    authCodes.set(code, {
      code,
      clientId: client_id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      scope,
      user: { id: 'user_1', name: 'Mock Developer', email: 'dev@example.com' },
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const targetUrl = new URL(redirect_uri);
    targetUrl.searchParams.set('code', code);
    if (state) targetUrl.searchParams.set('state', state);
    return res.redirect(targetUrl.toString());
  }

  // Interactive HTML Approval Form
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>OmniMock OAuth2 Authorization</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #1e293b; border-radius: 12px; padding: 2rem; max-width: 450px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; }
        h2 { margin-top: 0; color: #38bdf8; }
        .scope-badge { display: inline-block; background: #0369a1; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85rem; margin: 2px; }
        .btn { display: block; width: 100%; padding: 0.75rem; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; text-align: center; margin-top: 1rem; text-decoration: none; box-sizing: border-box; }
        .btn-approve { background: #0284c7; color: white; }
        .btn-approve:hover { background: #0369a1; }
        .btn-deny { background: #475569; color: #cbd5e1; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Authorize Application</h2>
        <p><strong>Client ID:</strong> <code>${client_id}</code></p>
        <p><strong>Redirect URI:</strong> <code>${redirect_uri}</code></p>
        <p><strong>Requested Scopes:</strong></p>
        <div>
          ${(scope || 'openid profile email read write')
            .split(' ')
            .map(s => `<span class="scope-badge">${s}</span>`)
            .join(' ')}
        </div>
        ${code_challenge ? `<p><small>🔒 PKCE Protected (${code_challenge_method || 'plain'})</small></p>` : ''}
        <a class="btn btn-approve" href="?${new URLSearchParams({ ...(req.query as any), auto_approve: 'true' }).toString()}">Authorize & Continue</a>
        <a class="btn btn-deny" href="${redirect_uri}?error=access_denied&state=${encodeURIComponent(state || '')}">Deny</a>
      </div>
    </body>
    </html>
  `;
  res.send(html);
});

// -------------------------------------------------------------
// 4. Token Endpoint
// -------------------------------------------------------------
router.post('/token', (req: Request, res: Response) => {
  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    client_secret,
    code_verifier,
    refresh_token,
    username,
    password,
    scope,
  } = req.body;

  // Extract client credentials from Basic Auth if provided
  let authClientId = client_id;
  if (req.headers.authorization?.startsWith('Basic ')) {
    const creds = Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString('ascii');
    authClientId = creds.split(':')[0];
  }

  // 1. Authorization Code Grant
  if (grant_type === 'authorization_code') {
    if (!code) return res.status(400).json({ error: 'invalid_request', error_description: 'Missing code' });
    const codeData = authCodes.get(code);

    if (!codeData || Date.now() > codeData.expiresAt) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Code invalid or expired' });
    }

    // Verify PKCE if challenge was set
    if (codeData.codeChallenge) {
      if (!code_verifier || !verifyPkce(code_verifier, codeData.codeChallenge, codeData.codeChallengeMethod)) {
        return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
      }
    }

    authCodes.delete(code); // One-time use

    const tokenPayload = {
      sub: codeData.user.id,
      client_id: codeData.clientId,
      scope: codeData.scope || 'openid profile',
      name: codeData.user.name,
      email: codeData.user.email,
    };

    const accessToken = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '1h' });
    const newRefreshToken = `rt_${uuidv4()}`;
    refreshTokens.set(newRefreshToken, tokenPayload);

    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: newRefreshToken,
      scope: codeData.scope || 'openid profile',
      id_token: jwt.sign({ ...tokenPayload, iss: 'omnimock' }, config.jwtSecret, { expiresIn: '1h' }),
    });
  }

  // 2. Client Credentials Grant
  if (grant_type === 'client_credentials') {
    const tokenPayload = {
      sub: authClientId || 'service_client',
      client_id: authClientId || 'service_client',
      scope: scope || 'read write',
      type: 'client_credentials',
    };
    const accessToken = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '1h' });
    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: scope || 'read write',
    });
  }

  // 3. Refresh Token Grant
  if (grant_type === 'refresh_token') {
    if (!refresh_token || !refreshTokens.has(refresh_token)) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid refresh token' });
    }
    const oldPayload = refreshTokens.get(refresh_token);
    const newAccessToken = jwt.sign(oldPayload, config.jwtSecret, { expiresIn: '1h' });
    const newRefreshToken = `rt_${uuidv4()}`;
    refreshTokens.delete(refresh_token);
    refreshTokens.set(newRefreshToken, oldPayload);

    return res.json({
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: newRefreshToken,
      scope: oldPayload.scope,
    });
  }

  // 4. Resource Owner Password Grant
  if (grant_type === 'password') {
    const tokenPayload = {
      sub: username || 'resource_owner',
      username,
      scope: scope || 'read write',
    };
    const accessToken = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '1h' });
    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: scope || 'read write',
    });
  }

  res.status(400).json({
    error: 'unsupported_grant_type',
    error_description: `Grant type '${grant_type}' is not supported. Supported: authorization_code, client_credentials, refresh_token, password`,
  });
});

// -------------------------------------------------------------
// 5. UserInfo Endpoint
// -------------------------------------------------------------
router.get('/userinfo', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', error_description: 'Bearer token required' });
  }

  try {
    const decoded: any = jwt.verify(authHeader.split(' ')[1], config.jwtSecret);
    res.json({
      sub: decoded.sub || 'user_123',
      name: decoded.name || 'OmniMock User',
      email: decoded.email || 'user@example.com',
      email_verified: true,
      roles: ['tester', 'admin'],
      updated_at: Math.floor(Date.now() / 1000),
    });
  } catch (err) {
    res.status(401).json({ error: 'invalid_token', error_description: 'Token expired or malformed' });
  }
});

// -------------------------------------------------------------
// 6. Token Introspection (RFC 7662) & Revocation
// -------------------------------------------------------------
router.post('/introspect', (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) return res.json({ active: false });

  try {
    const decoded: any = jwt.verify(token, config.jwtSecret);
    res.json({
      active: true,
      scope: decoded.scope || 'read write',
      client_id: decoded.client_id || 'test_client',
      sub: decoded.sub,
      exp: decoded.exp,
      iat: decoded.iat,
      token_type: 'Bearer',
    });
  } catch {
    res.json({ active: false });
  }
});

router.post('/revoke', (req: Request, res: Response) => {
  const { token } = req.body;
  if (token && refreshTokens.has(token)) {
    refreshTokens.delete(token);
  }
  res.status(200).json({ status: 'revoked' });
});

export default router;
