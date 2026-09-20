import { Router, Request, Response } from 'express';
import { faker } from '@faker-js/faker';

const router = Router();

interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id?: string | number | null;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

const rpcMethods: Record<string, (params: any) => Promise<any> | any> = {
  // 1. Echo
  echo: (params) => params,

  // 2. Server time
  serverTime: () => ({
    iso: new Date().toISOString(),
    timestamp: Date.now(),
  }),

  // 3. Get User
  getUser: (params) => {
    const id = params?.id || params?.userId || faker.string.uuid();
    return {
      id,
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: 'ADMIN',
      balance: parseFloat(faker.finance.amount()),
    };
  },

  // 4. Calculate
  calculate: (params) => {
    const { op, a, b } = params || {};
    const numA = Number(a) || 0;
    const numB = Number(b) || 0;
    switch (op) {
      case 'add': return { result: numA + numB };
      case 'subtract': return { result: numA - numB };
      case 'multiply': return { result: numA * numB };
      case 'divide':
        if (numB === 0) throw { code: -32602, message: 'Division by zero' };
        return { result: numA / numB };
      default:
        throw { code: -32602, message: `Unknown operation '${op}'. Supported: add, subtract, multiply, divide` };
    }
  },

  // 5. Blockchain Block simulation
  getBlockchainBlock: (params) => {
    const blockNumber = params?.blockNumber || 19284712;
    return {
      number: blockNumber,
      hash: faker.git.commitSha(),
      parentHash: faker.git.commitSha(),
      nonce: '0x' + faker.string.hexadecimal({ length: 16, prefix: '' }),
      gasUsed: '21000',
      transactions: Array.from({ length: 3 }, () => faker.git.commitSha()),
      timestamp: Math.floor(Date.now() / 1000),
    };
  },
};

async function processSingleRpc(req: any): Promise<JsonRpcResponse | null> {
  // Validate JSON-RPC 2.0 format
  if (!req || typeof req !== 'object' || req.jsonrpc !== '2.0' || !req.method || typeof req.method !== 'string') {
    return {
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0" and method must be a string' },
      id: req?.id ?? null,
    };
  }

  const handler = rpcMethods[req.method];
  if (!handler) {
    if (req.id === undefined) return null; // Notification
    return {
      jsonrpc: '2.0',
      error: { code: -32601, message: `Method '${req.method}' not found. Supported methods: ${Object.keys(rpcMethods).join(', ')}` },
      id: req.id,
    };
  }

  try {
    const result = await handler(req.params);
    if (req.id === undefined) return null; // Notification has no response
    return {
      jsonrpc: '2.0',
      result,
      id: req.id,
    };
  } catch (err: any) {
    if (req.id === undefined) return null;
    return {
      jsonrpc: '2.0',
      error: {
        code: err.code || -32603,
        message: err.message || 'Internal JSON-RPC error',
        data: err.data,
      },
      id: req.id,
    };
  }
}

// JSON-RPC 2.0 Handler
router.post('/json', async (req: Request, res: Response) => {
  const body = req.body;

  // Batch Request
  if (Array.isArray(body)) {
    if (body.length === 0) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request: empty batch' },
        id: null,
      });
    }

    const responses = (await Promise.all(body.map(item => processSingleRpc(item)))).filter(Boolean);
    if (responses.length === 0) {
      return res.status(204).end(); // All notifications
    }
    return res.json(responses);
  }

  // Single Request
  const response = await processSingleRpc(body);
  if (!response) {
    return res.status(204).end(); // Notification
  }
  res.json(response);
});

// Discovery / Documentation
router.get('/json', (_req: Request, res: Response) => {
  res.json({
    protocol: 'JSON-RPC 2.0',
    endpoint: '/rpc/json',
    supportedMethods: Object.keys(rpcMethods),
    sampleRequest: {
      jsonrpc: '2.0',
      method: 'calculate',
      params: { op: 'add', a: 15, b: 27 },
      id: 1,
    },
    sampleBatch: [
      { jsonrpc: '2.0', method: 'serverTime', id: 1 },
      { jsonrpc: '2.0', method: 'getUser', params: { id: 'user_99' }, id: 2 },
    ],
  });
});

export default router;
