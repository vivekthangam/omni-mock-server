import path from 'path';
import fs from 'fs';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { auditService } from '../../audit/audit.service';

const PROTO_PATH = fs.existsSync(path.resolve(process.cwd(), 'proto/test_service.proto'))
  ? path.resolve(process.cwd(), 'proto/test_service.proto')
  : path.resolve(__dirname, '../../../proto/test_service.proto');


let omnimock: any = null;
try {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
  omnimock = protoDescriptor?.omnimock?.v1;
} catch (err) {
  console.error('[gRPC] Failed to load proto definition:', err);
}


// Service Implementation
const serviceImplementation = {
  // 1. Unary Echo
  UnaryEcho: (call: any, callback: any) => {
    const startTime = Date.now();
    const req = call.request;
    const response = {
      message: `Echo from OmniMock gRPC: ${req.message}`,
      timestamp: Date.now(),
      received_metadata: req.metadata || {},
    };

    auditService.record({
      protocol: 'GRPC',
      method: 'UnaryEcho',
      path: '/omnimock.v1.TestService/UnaryEcho',
      requestBody: req,
      responseBody: response,
      latencyMs: Date.now() - startTime,
    });

    callback(null, response);
  },

  // 2. Unary GetUser
  GetUser: (call: any, callback: any) => {
    const req = call.request;
    const response = {
      id: req.user_id || 'usr_default',
      name: 'Alice Developer',
      email: 'alice@example.com',
      role: 'ADMIN',
      created_at: Date.now() - 86400000,
    };

    auditService.record({
      protocol: 'GRPC',
      method: 'GetUser',
      path: '/omnimock.v1.TestService/GetUser',
      requestBody: req,
      responseBody: response,
    });

    callback(null, response);
  },

  // 3. Server Streaming
  StreamTicks: (call: any) => {
    const count = Math.min(call.request.count || 5, 50);
    const intervalMs = Math.max(call.request.interval_ms || 500, 100);

    auditService.record({
      protocol: 'GRPC',
      method: 'StreamTicks (Server Streaming Started)',
      path: '/omnimock.v1.TestService/StreamTicks',
      requestBody: call.request,
    });

    let seq = 0;
    const interval = setInterval(() => {
      seq++;
      call.write({
        sequence: seq,
        event_id: `evt_${seq}`,
        value: parseFloat((Math.random() * 100).toFixed(2)),
        timestamp: Date.now(),
      });

      if (seq >= count) {
        clearInterval(interval);
        call.end();
      }
    }, intervalMs);

    call.on('cancelled', () => {
      clearInterval(interval);
    });
  },

  // 4. Client Streaming
  RecordMetrics: (call: any, callback: any) => {
    const metrics: number[] = [];
    let sum = 0;

    call.on('data', (req: any) => {
      metrics.push(req.value);
      sum += req.value;
    });

    call.on('end', () => {
      const count = metrics.length;
      const average = count > 0 ? sum / count : 0;
      const min = count > 0 ? Math.min(...metrics) : 0;
      const max = count > 0 ? Math.max(...metrics) : 0;

      const response = {
        count,
        sum,
        average,
        min,
        max,
      };

      auditService.record({
        protocol: 'GRPC',
        method: 'RecordMetrics (Client Streaming Ended)',
        path: '/omnimock.v1.TestService/RecordMetrics',
        responseBody: response,
      });

      callback(null, response);
    });
  },

  // 5. Bidirectional Streaming
  ChatStream: (call: any) => {
    call.on('data', (req: any) => {
      auditService.record({
        protocol: 'GRPC',
        method: 'ChatStream (Bi-directional Message)',
        path: '/omnimock.v1.TestService/ChatStream',
        requestBody: req,
      });

      // Echo back with server acknowledgment
      call.write({
        sender: 'OmniMock Server',
        content: `Ack: Received '${req.content}' from ${req.sender}`,
        timestamp: Date.now(),
      });
    });

    call.on('end', () => {
      call.end();
    });
  },

  // 6. Server Streaming ListProducts
  ListProducts: (call: any) => {
    const filter = call.request || {};
    const limit = Math.min(filter.limit || 5, 20);
    const category = filter.category || '';
    const maxPrice = filter.max_price || 9999;

    auditService.record({
      protocol: 'GRPC',
      method: 'ListProducts (Streaming Products)',
      path: '/omnimock.v1.TestService/ListProducts',
      requestBody: filter,
    });

    const sampleProducts = [
      { id: 'prod_1', title: 'Ultra Wireless Hub', price: 129.99, category: 'Hardware', in_stock: true },
      { id: 'prod_2', title: 'Gigabit Switch 8P', price: 69.50, category: 'Hardware', in_stock: true },
      { id: 'prod_3', title: 'API Monitoring License', price: 299.00, category: 'Software', in_stock: true },
      { id: 'prod_4', title: 'Developer Workstation', price: 1499.00, category: 'Hardware', in_stock: false },
      { id: 'prod_5', title: 'Mesh Beacon', price: 49.99, category: 'Hardware', in_stock: true },
    ];

    let count = 0;
    const interval = setInterval(() => {
      if (count >= limit || count >= sampleProducts.length) {
        clearInterval(interval);
        call.end();
        return;
      }
      const prod = sampleProducts[count];
      if (!category || prod.category.toLowerCase() === category.toLowerCase()) {
        if (prod.price <= maxPrice) {
          call.write(prod);
        }
      }
      count++;
    }, 200);

    call.on('cancelled', () => {
      clearInterval(interval);
    });
  },

  // 7. Error Simulation
  SimulateError: (call: any, callback: any) => {
    const { status_code, error_message } = call.request;
    const code = status_code || grpc.status.NOT_FOUND;
    const message = error_message || 'Simulated gRPC error from OmniMock';

    auditService.record({
      protocol: 'GRPC',
      method: 'SimulateError (Error Emitted)',
      path: '/omnimock.v1.TestService/SimulateError',
      requestBody: call.request,
      responseStatus: code,
    });

    callback({
      code,
      message,
    });
  },
};

export function startGrpcServer(port: number): grpc.Server {
  const server = new grpc.Server();

  if (omnimock?.TestService?.service) {
    server.addService(omnimock.TestService.service, serviceImplementation);
  } else {
    console.warn('[gRPC] omnimock.TestService definition not loaded; skipping gRPC service mount');
  }

  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('[gRPC] Failed to bind server:', err);
      return;
    }
    console.log(`[gRPC] Native gRPC Server running on 0.0.0.0:${boundPort}`);
  });

  return server;
}

