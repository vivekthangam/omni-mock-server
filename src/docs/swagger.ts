import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

const router = Router();

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'OmniMock Universal Testbed API',
    version: '1.0.0',
    description: `
**OmniMock** is an all-in-one multi-protocol test server designed to test API clients (like lux-api, Postman, Insomnia, curl) across all protocols.

### Supported Protocols:
- **REST & Httpbin**: \`/rest/*\`
- **Faker Generator**: \`/faker/*\`
- **Authentication & Security**: \`/auth/*\` (Basic, Digest, Bearer JWT, API Key, HMAC, AWS-SigV4)
- **OAuth 2.0 / OIDC**: \`/oauth/*\` (Authorization Code, PKCE, Client Credentials, UserInfo)
- **Server-Sent Events (SSE)**: \`/sse/*\`
- **Webhooks**: \`/webhooks/*\`
- **GraphQL**: \`/graphql\`
- **SOAP & WSDL**: \`/soap/service?wsdl\`
- **gRPC**: Port \`50051\`
- **WebSocket**: \`/ws/*\`
- **Socket.IO**: \`/socket.io/*\`
- **Audit Logs**: \`/audit/*\`
    `,
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local OmniMock Server',
    },
  ],
  components: {
    securitySchemes: {
      basicAuth: {
        type: 'http',
        scheme: 'basic',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      apiKeyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
      apiKeyQuery: {
        type: 'apiKey',
        in: 'query',
        name: 'api_key',
      },
      oauth2: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'http://localhost:3000/oauth/authorize',
            tokenUrl: 'http://localhost:3000/oauth/token',
            scopes: {
              openid: 'OpenID Connect identity',
              profile: 'User profile access',
              email: 'User email access',
              read: 'Read access',
              write: 'Write access',
            },
          },
        },
      },
    },
  },
  paths: {
    '/rest/get': {
      get: {
        summary: 'Echo GET request',
        tags: ['REST'],
        responses: { 200: { description: 'Echo response with headers, query parameters, IP' } },
      },
    },
    '/rest/post': {
      post: {
        summary: 'Echo POST request body',
        tags: ['REST'],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Echo response' } },
      },
    },
    '/rest/status/{code}': {
      get: {
        summary: 'Return specific HTTP status code',
        tags: ['REST'],
        parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'integer', example: 404 } }],
        responses: { default: { description: 'Dynamic HTTP status response' } },
      },
    },
    '/rest/delay/{ms}': {
      get: {
        summary: 'Simulate response latency (0 to 30000 ms)',
        tags: ['REST'],
        parameters: [{ name: 'ms', in: 'path', required: true, schema: { type: 'integer', example: 1000 } }],
        responses: { 200: { description: 'Delayed response' } },
      },
    },
    '/faker/users': {
      get: {
        summary: 'Generate realistic mock users',
        tags: ['Faker Mock Data'],
        parameters: [{ name: 'count', in: 'query', schema: { type: 'integer', default: 10 } }],
        responses: { 200: { description: 'Array of user profiles with address, company, avatars' } },
      },
    },
    '/faker/products': {
      get: {
        summary: 'Generate realistic mock products',
        tags: ['Faker Mock Data'],
        parameters: [{ name: 'count', in: 'query', schema: { type: 'integer', default: 10 } }],
        responses: { 200: { description: 'Array of products with SKUs, prices, ratings' } },
      },
    },
    '/faker/finance': {
      get: {
        summary: 'Generate mock financial and banking records',
        tags: ['Faker Mock Data'],
        parameters: [{ name: 'count', in: 'query', schema: { type: 'integer', default: 10 } }],
        responses: { 200: { description: 'Array of financial records (IBAN, masked card, transactions)' } },
      },
    },
    '/auth/basic/{username}/{password}': {
      get: {
        summary: 'Test HTTP Basic Auth',
        tags: ['Auth & Security'],
        security: [{ basicAuth: [] }],
        parameters: [
          { name: 'username', in: 'path', required: true, schema: { type: 'string', example: 'admin' } },
          { name: 'password', in: 'path', required: true, schema: { type: 'string', example: 'secret123' } },
        ],
        responses: { 200: { description: 'Authenticated' }, 401: { description: 'Unauthorized' } },
      },
    },
    '/auth/jwt/token': {
      post: {
        summary: 'Issue a new Bearer JWT token',
        tags: ['Auth & Security'],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'JWT Access Token' } },
      },
    },
    '/auth/jwt/protected': {
      get: {
        summary: 'Validate Bearer JWT token',
        tags: ['Auth & Security'],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Valid token' }, 401: { description: 'Invalid or missing token' } },
      },
    },
    '/auth/apikey/header': {
      get: {
        summary: 'Test X-API-Key Header authentication',
        tags: ['Auth & Security'],
        security: [{ apiKeyHeader: [] }],
        responses: { 200: { description: 'Authorized' }, 403: { description: 'Forbidden' } },
      },
    },
    '/oauth/authorize': {
      get: {
        summary: 'OAuth 2.0 Authorization Endpoint',
        tags: ['OAuth 2.0 & OIDC'],
        parameters: [
          { name: 'client_id', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'redirect_uri', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'response_type', in: 'query', required: true, schema: { type: 'string', example: 'code' } },
          { name: 'code_challenge', in: 'query', schema: { type: 'string' } },
          { name: 'code_challenge_method', in: 'query', schema: { type: 'string', example: 'S256' } },
        ],
        responses: { 200: { description: 'Consent screen or redirect' } },
      },
    },
    '/oauth/token': {
      post: {
        summary: 'OAuth 2.0 Token Exchange Endpoint',
        tags: ['OAuth 2.0 & OIDC'],
        requestBody: {
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  grant_type: { type: 'string', example: 'authorization_code' },
                  code: { type: 'string' },
                  redirect_uri: { type: 'string' },
                  code_verifier: { type: 'string' },
                  client_id: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Access Token & Refresh Token' } },
      },
    },
    '/audit/logs': {
      get: {
        summary: 'Query all recorded Audit Logs',
        tags: ['Audit & Observability'],
        parameters: [
          { name: 'protocol', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: { 200: { description: 'List of audit records' } },
      },
    },
  },
};

router.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

router.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default router;
