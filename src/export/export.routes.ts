import { Router, Request, Response } from 'express';

const router = Router();

// 1. Export as Postman Collection v2.1.0
router.get('/postman', (req: Request, res: Response) => {
  const host = `${req.protocol}://${req.get('host')}`;

  const postmanCollection = {
    info: {
      _postman_id: 'omnimock-collection-v1',
      name: 'OmniMock API Suite',
      description: 'Comprehensive multi-protocol API test collection for OmniMock (REST, Faker, Auth, OAuth2, GraphQL, SOAP, SSE, Webhooks).',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: [
      {
        name: 'REST & Httpbin',
        item: [
          {
            name: 'GET Echo',
            request: {
              method: 'GET',
              header: [],
              url: {
                raw: `${host}/rest/get?test=123&category=tech`,
                host: [host],
                path: ['rest', 'get'],
                query: [
                  { key: 'test', value: '123' },
                  { key: 'category', value: 'tech' },
                ],
              },
            },
          },
          {
            name: 'POST Echo JSON',
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ name: 'Alice Developer', role: 'Tester', active: true }, null, 2),
              },
              url: { raw: `${host}/rest/post`, host: [host], path: ['rest', 'post'] },
            },
          },
          {
            name: 'Status Code 429 (Rate Limit)',
            request: {
              method: 'GET',
              header: [],
              url: { raw: `${host}/rest/status/429`, host: [host], path: ['rest', 'status', '429'] },
            },
          },
          {
            name: 'Latency Delay (2000ms)',
            request: {
              method: 'GET',
              header: [],
              url: { raw: `${host}/rest/delay/2000`, host: [host], path: ['rest', 'delay', '2000'] },
            },
          },
          {
            name: 'NDJSON Stream (10 Chunks)',
            request: {
              method: 'GET',
              header: [],
              url: { raw: `${host}/rest/stream/10`, host: [host], path: ['rest', 'stream', '10'] },
            },
          },
        ],
      },
      {
        name: 'Faker Mock Engine',
        item: [
          {
            name: 'Get Mock Users',
            request: {
              method: 'GET',
              header: [],
              url: { raw: `${host}/faker/users?count=10`, host: [host], path: ['faker', 'users'], query: [{ key: 'count', value: '10' }] },
            },
          },
          {
            name: 'Get Mock Products',
            request: {
              method: 'GET',
              header: [],
              url: { raw: `${host}/faker/products?count=5`, host: [host], path: ['faker', 'products'], query: [{ key: 'count', value: '5' }] },
            },
          },
          {
            name: 'Get Mock Finance (IBAN & CC)',
            request: {
              method: 'GET',
              header: [],
              url: { raw: `${host}/faker/finance?count=5`, host: [host], path: ['faker', 'finance'], query: [{ key: 'count', value: '5' }] },
            },
          },
          {
            name: 'Generate Custom Schema',
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({
                  count: 3,
                  schema: {
                    id: 'string.uuid',
                    fullName: 'person.fullName',
                    email: 'internet.email',
                    creditCard: 'finance.creditCardNumber',
                    city: 'location.city',
                  },
                }, null, 2),
              },
              url: { raw: `${host}/faker/custom`, host: [host], path: ['faker', 'custom'] },
            },
          },
        ],
      },
      {
        name: 'Authentication & Security',
        item: [
          {
            name: 'Basic Auth (admin:password)',
            request: {
              auth: {
                type: 'basic',
                basic: [
                  { key: 'username', value: 'admin', type: 'string' },
                  { key: 'password', value: 'password', type: 'string' },
                ],
              },
              method: 'GET',
              header: [],
              url: { raw: `${host}/auth/basic/admin/password`, host: [host], path: ['auth', 'basic', 'admin', 'password'] },
            },
          },
          {
            name: 'Generate Bearer JWT Token',
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'raw',
                raw: JSON.stringify({ sub: 'user_123', name: 'Postman User', role: 'admin' }, null, 2),
              },
              url: { raw: `${host}/auth/jwt/token`, host: [host], path: ['auth', 'jwt', 'token'] },
            },
          },
          {
            name: 'API Key Header (X-API-Key)',
            request: {
              auth: {
                type: 'apikey',
                apikey: [
                  { key: 'key', value: 'X-API-Key', type: 'string' },
                  { key: 'value', value: 'omnimock_secret_api_key_xyz987', type: 'string' },
                  { key: 'in', value: 'header', type: 'string' },
                ],
              },
              method: 'GET',
              header: [],
              url: { raw: `${host}/auth/apikey/header`, host: [host], path: ['auth', 'apikey', 'header'] },
            },
          },
          {
            name: 'OAuth 2.0 Client Credentials',
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/x-www-form-urlencoded' }],
              body: {
                mode: 'urlencoded',
                urlencoded: [
                  { key: 'grant_type', value: 'client_credentials', type: 'text' },
                  { key: 'client_id', value: 'lux-client', type: 'text' },
                  { key: 'client_secret', value: 'lux-secret', type: 'text' },
                  { key: 'scope', value: 'read write', type: 'text' },
                ],
              },
              url: { raw: `${host}/oauth/token`, host: [host], path: ['oauth', 'token'] },
            },
          },
        ],
      },
      {
        name: 'GraphQL',
        item: [
          {
            name: 'Query Users & Products',
            request: {
              method: 'POST',
              header: [{ key: 'Content-Type', value: 'application/json' }],
              body: {
                mode: 'graphql',
                graphql: {
                  query: 'query GetAllData {\n  users(limit: 3) {\n    id\n    name\n    email\n    role\n  }\n  products(limit: 2) {\n    id\n    title\n    price\n  }\n}',
                },
              },
              url: { raw: `${host}/graphql`, host: [host], path: ['graphql'] },
            },
          },
        ],
      },
      {
        name: 'SOAP / XML',
        item: [
          {
            name: 'SOAP GetUserDetails',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'text/xml; charset=utf-8' },
                { key: 'SOAPAction', value: 'GetUserDetails' },
              ],
              body: {
                mode: 'raw',
                raw: '<?xml version="1.0" encoding="UTF-8"?>\n<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://omnimock.local/soap/service">\n  <soap:Body>\n    <tns:GetUserDetailsRequest>\n      <userId>usr_postman_1</userId>\n    </tns:GetUserDetailsRequest>\n  </soap:Body>\n</soap:Envelope>',
              },
              url: { raw: `${host}/soap/service`, host: [host], path: ['soap', 'service'] },
            },
          },
        ],
      },
    ],
  };

  res.setHeader('Content-Disposition', 'attachment; filename="OmniMock-Postman-Collection.json"');
  res.setHeader('Content-Type', 'application/json');
  res.json(postmanCollection);
});

// 2. Export as Lux-API Workspace JSON
router.get('/lux-api', (req: Request, res: Response) => {
  const host = `${req.protocol}://${req.get('host')}`;

  const luxApiWorkspace = {
    version: '1.0.0',
    type: 'workspace',
    name: 'OmniMock Protocol Sandbox',
    environment: {
      baseUrl: host,
      grpcHost: 'localhost:50051',
      wsUrl: `ws://${req.get('host')}`,
      apiKey: 'omnimock_secret_api_key_xyz987',
    },
    folders: [
      { id: 'f_rest', name: 'REST APIs' },
      { id: 'f_faker', name: 'Faker Generators' },
      { id: 'f_auth', name: 'Security & Auth' },
      { id: 'f_graphql', name: 'GraphQL' },
      { id: 'f_soap', name: 'SOAP XML' },
      { id: 'f_grpc', name: 'gRPC Requests' },
      { id: 'f_ws', name: 'WebSocket Streams' },
      { id: 'f_webhooks', name: 'Webhooks' },
    ],
    requests: [
      { id: 'req_1', folderId: 'f_rest', name: 'GET Echo', method: 'GET', url: '{{baseUrl}}/rest/get' },
      { id: 'req_2', folderId: 'f_rest', name: 'POST Echo', method: 'POST', url: '{{baseUrl}}/rest/post', body: { json: { test: true } } },
      { id: 'req_3', folderId: 'f_faker', name: 'Faker Users', method: 'GET', url: '{{baseUrl}}/faker/users?count=10' },
      { id: 'req_4', folderId: 'f_auth', name: 'Protected JWT', method: 'GET', url: '{{baseUrl}}/auth/jwt/protected', auth: { type: 'bearer' } },
      { id: 'req_5', folderId: 'f_graphql', name: 'GraphQL Query', method: 'POST', url: '{{baseUrl}}/graphql', body: { graphql: '{ users { id name } }' } },
      { id: 'req_6', folderId: 'f_grpc', name: 'gRPC Echo', protocol: 'grpc', url: '{{grpcHost}}', service: 'omnimock.v1.TestService/UnaryEcho' },
      { id: 'req_7', folderId: 'f_ws', name: 'WS Live Ticker', protocol: 'websocket', url: '{{wsUrl}}/ws/ticker' },
    ],
  };

  res.setHeader('Content-Disposition', 'attachment; filename="OmniMock-LuxAPI-Workspace.json"');
  res.setHeader('Content-Type', 'application/json');
  res.json(luxApiWorkspace);
});

export default router;
