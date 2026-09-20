process.on('uncaughtException', (err) => {
  console.error('\n❌ [FATAL UNCAUGHT EXCEPTION]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n❌ [FATAL UNHANDLED REJECTION]:', reason);
});

import http from 'http';
import path from 'path';
import fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';


import { config } from './config';
import { auditService } from './audit/audit.service';
import restRoutes from './protocols/rest/httpbin.routes';
import fakerRoutes from './protocols/faker/faker.routes';
import authRoutes from './protocols/auth/auth.routes';
import oauthRoutes from './protocols/auth/oauth2/oauth2.routes';
import sseRoutes from './protocols/sse/sse.routes';
import webhookRoutes from './protocols/webhooks/inbox.routes';
import soapRoutes from './protocols/soap/soap.server';
import auditRoutes from './audit/audit.routes';
import swaggerRoutes from './docs/swagger';
import exportRoutes from './export/export.routes';
import chaosRoutes from './chaos/chaos.routes';
import dbRoutes from './db/db.routes';
import mocksRoutes, { customMockInterceptor } from './mocks/mocks.routes';
import jsonrpcRoutes from './rpc/jsonrpc.routes';
import { chaosMiddleware } from './chaos/chaos.service';
import { yoga } from './protocols/graphql/graphql.server';

import { setupWebSocket } from './protocols/websocket/ws.server';
import { setupSocketIO } from './protocols/socketio/socketio.server';
import { startGrpcServer } from './protocols/grpc/grpc.server';

const app = express();
const server = http.createServer(app);

// Global Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(cookieParser());

// Support JSON, URL-Encoded, and Raw Text (for XML / SOAP / HMAC)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.text({ type: ['text/*', 'application/xml', 'text/xml'], limit: '10mb' }));

// Chaos Engineering Fault Injection Middleware
app.use(chaosMiddleware);

// Audit Logging Middleware for all HTTP requests
app.use((req: Request, res: Response, next: NextFunction) => {
  // Don't audit stream polling or static assets to keep terminal clean
  if (
    req.path.startsWith('/audit/stream') ||
    req.path.startsWith('/ui') ||
    req.path.endsWith('.js') ||
    req.path.endsWith('.css') ||
    req.path.endsWith('.png') ||
    req.path.endsWith('.ico') ||
    req.path.endsWith('.svg') ||
    req.path.includes('/swagger-ui')
  ) {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    // Detect protocol category
    let protocol: any = 'REST';
    if (req.path.startsWith('/graphql')) protocol = 'GRAPHQL';
    else if (req.path.startsWith('/soap')) protocol = 'SOAP';
    else if (req.path.startsWith('/sse')) protocol = 'SSE';
    else if (req.path.startsWith('/oauth')) protocol = 'OAUTH';
    else if (req.path.startsWith('/auth')) protocol = 'AUTH';
    else if (req.path.startsWith('/webhooks')) protocol = 'WEBHOOK';
    else if (req.path.startsWith('/db')) protocol = 'REST';
    else if (req.path.startsWith('/rpc')) protocol = 'REST';

    auditService.record({
      protocol,
      method: req.method,
      path: req.originalUrl || req.url,
      clientIp: req.ip || req.socket.remoteAddress,
      headers: req.headers,
      query: req.query,
      requestBody: req.body,
      responseStatus: res.statusCode,
      latencyMs: Date.now() - startTime,
    });
  });

  next();
});


// Dynamic Custom Mock Interceptor
app.use(customMockInterceptor);

// Static Dashboard UI
const staticPath = fs.existsSync(path.resolve(process.cwd(), 'src/ui/public'))
  ? path.resolve(process.cwd(), 'src/ui/public')
  : path.resolve(__dirname, 'ui/public');
app.use('/', express.static(staticPath));

// Protocol & Feature Mounts
try {
  app.use('/rest', restRoutes);
  app.use('/faker', fakerRoutes);
  app.use('/auth', authRoutes);
  app.use('/oauth', oauthRoutes);
  app.use('/.well-known', oauthRoutes);
  app.use('/sse', sseRoutes);
  app.use('/webhooks', webhookRoutes);
  app.use('/soap', soapRoutes);
  app.use('/audit', auditRoutes);
  app.use('/export', exportRoutes);
  app.use('/chaos', chaosRoutes);
  app.use('/db', dbRoutes);
  app.use('/mocks', mocksRoutes);
  app.use('/rpc', jsonrpcRoutes);
  app.use('/', swaggerRoutes);

  // GraphQL Yoga
  app.use('/graphql', yoga);

  // Realtime Protocols
  setupWebSocket(server);
  setupSocketIO(server);
} catch (mountErr) {
  console.error('\n❌ [ERROR MOUNTING ROUTES/PROTOCOLS]:', mountErr);
}

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`\n⚠️ [Server] Port ${config.port} is already in use. Retrying in 1.5s...`);
    setTimeout(() => {
      server.close();
      server.listen(config.port);
    }, 1500);
  } else {
    console.error('\n❌ [Server Error]:', err);
  }
});

// Start HTTP Server
try {
  server.listen(config.port, () => {
    console.log(`\n=======================================================`);
    console.log(`🚀 OmniMock Server running on http://localhost:${config.port}`);
    console.log(`📖 Swagger OpenAPI Docs: http://localhost:${config.port}/docs`);
    console.log(`⚡ GraphiQL Playground: http://localhost:${config.port}/graphql`);
    console.log(`📜 SOAP WSDL: http://localhost:${config.port}/soap/service?wsdl`);
    console.log(`💾 Mock Database Engine: http://localhost:${config.port}/db`);
    console.log(`🌪️ Chaos Config: http://localhost:${config.port}/chaos/config`);
    console.log(`📊 Audit Log Stream: http://localhost:${config.port}/audit/stream`);
    console.log(`=======================================================\n`);
  });
} catch (listenErr) {
  console.error('\n❌ [ERROR STARTING HTTP SERVER]:', listenErr);
}

// Start Native gRPC Server
try {
  startGrpcServer(config.grpcPort);
} catch (grpcErr) {
  console.error('\n❌ [ERROR STARTING gRPC SERVER]:', grpcErr);
}


