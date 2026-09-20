import { createYoga, createSchema } from 'graphql-yoga';
import { faker } from '@faker-js/faker';
import { auditService } from '../../audit/audit.service';

const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    avatar: String
  }

  type Product {
    id: ID!
    title: String!
    price: Float!
    category: String!
    inStock: Boolean!
  }

  type Order {
    id: ID!
    user: User!
    products: [Product!]!
    totalAmount: Float!
    status: String!
    createdAt: String!
  }

  type ServerHealth {
    status: String!
    uptimeSeconds: Float!
    memoryUsageMb: Float!
    protocolsActive: [String!]!
    timestamp: String!
  }

  type StockTick {
    symbol: String!
    price: Float!
    change: Float!
    timestamp: String!
  }

  input CreateUserInput {
    name: String!
    email: String!
    role: String
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
    unitPrice: Float!
  }

  input CreateOrderInput {
    userId: ID!
    items: [OrderItemInput!]!
  }

  type Query {
    hello(name: String): String!
    users(limit: Int): [User!]!
    user(id: ID!): User
    products(category: String, limit: Int): [Product!]!
    searchProducts(query: String, category: String, minPrice: Float, maxPrice: Float): [Product!]!
    orders(limit: Int): [Order!]!
    serverHealth: ServerHealth!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    createProduct(title: String!, price: Float!, category: String!): Product!
    createOrder(input: CreateOrderInput!): Order!
    triggerError(code: String!): String
  }

  type Subscription {
    liveOrder: Order!
    countdown(from: Int!): Int!
    stockPrice(symbol: String!): StockTick!
  }
`;

function fakeUser(id?: string) {
  return {
    id: id || faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    role: faker.helpers.arrayElement(['ADMIN', 'USER', 'DEVELOPER']),
    avatar: faker.image.avatar(),
  };
}

function fakeProduct(id?: string, override?: Partial<any>) {
  return {
    id: id || faker.string.uuid(),
    title: override?.title || faker.commerce.productName(),
    price: override?.price || parseFloat(faker.commerce.price({ min: 10, max: 500 })),
    category: override?.category || faker.commerce.department(),
    inStock: override?.inStock !== undefined ? override.inStock : faker.datatype.boolean(),
  };
}

function fakeOrder(id?: string, userId?: string) {
  const products = [fakeProduct(), fakeProduct()];
  return {
    id: id || faker.string.uuid(),
    user: fakeUser(userId),
    products,
    totalAmount: products.reduce((acc, p) => acc + p.price, 0),
    status: faker.helpers.arrayElement(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']),
    createdAt: new Date().toISOString(),
  };
}

const startTime = Date.now();

const resolvers = {
  Query: {
    hello: (_: any, { name }: { name?: string }) => `Hello ${name || 'World'} from OmniMock GraphQL!`,
    users: (_: any, { limit = 5 }: { limit?: number }) => Array.from({ length: limit }, () => fakeUser()),
    user: (_: any, { id }: { id: string }) => fakeUser(id),
    products: (_: any, { limit = 5 }: { limit?: number }) => Array.from({ length: limit }, () => fakeProduct()),
    searchProducts: (_: any, { query, category, minPrice = 0, maxPrice = 9999 }: any) => {
      const all = Array.from({ length: 12 }, () => fakeProduct());
      return all.filter(p => {
        if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
        if (category && !p.category.toLowerCase().includes(category.toLowerCase())) return false;
        if (p.price < minPrice || p.price > maxPrice) return false;
        return true;
      });
    },
    orders: (_: any, { limit = 3 }: { limit?: number }) => Array.from({ length: limit }, () => fakeOrder()),
    serverHealth: () => {
      const memory = process.memoryUsage();
      return {
        status: 'OPERATIONAL',
        uptimeSeconds: Math.round((Date.now() - startTime) / 1000),
        memoryUsageMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        protocolsActive: ['REST', 'GraphQL', 'gRPC', 'SOAP', 'WebSocket', 'Socket.IO', 'SSE', 'JSON-RPC', 'Webhooks'],
        timestamp: new Date().toISOString(),
      };
    },
  },
  Mutation: {
    createUser: (_: any, { input }: any) => {
      const user = {
        id: faker.string.uuid(),
        name: input.name,
        email: input.email,
        role: input.role || 'USER',
        avatar: faker.image.avatar(),
      };
      auditService.record({
        protocol: 'GRAPHQL',
        method: 'MUTATION createUser',
        path: '/graphql',
        requestBody: input,
        responseBody: user,
      });
      return user;
    },
    createProduct: (_: any, { title, price, category }: any) => {
      const product = {
        id: faker.string.uuid(),
        title,
        price,
        category,
        inStock: true,
      };
      auditService.record({
        protocol: 'GRAPHQL',
        method: 'MUTATION createProduct',
        path: '/graphql',
        requestBody: { title, price, category },
        responseBody: product,
      });
      return product;
    },
    createOrder: (_: any, { input }: any) => {
      const order = {
        id: faker.string.uuid(),
        user: fakeUser(input.userId),
        products: (input.items || []).map((item: any) => fakeProduct(item.productId, { price: item.unitPrice })),
        totalAmount: (input.items || []).reduce((sum: number, it: any) => sum + (it.quantity * it.unitPrice), 0),
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      };
      auditService.record({
        protocol: 'GRAPHQL',
        method: 'MUTATION createOrder',
        path: '/graphql',
        requestBody: input,
        responseBody: order,
      });
      return order;
    },
    triggerError: (_: any, { code }: { code: string }) => {
      throw new Error(`[OmniMock GraphQL Error] Simulated error with code: ${code}`);
    },
  },
  Subscription: {
    liveOrder: {
      subscribe: async function* () {
        while (true) {
          yield { liveOrder: fakeOrder() };
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      },
    },
    countdown: {
      subscribe: async function* (_: any, { from }: { from: number }) {
        for (let i = from; i >= 0; i--) {
          yield { countdown: i };
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      },
    },
    stockPrice: {
      subscribe: async function* (_: any, { symbol }: { symbol: string }) {
        let currentPrice = symbol.toUpperCase().includes('BTC') ? 64000.00 : 150.00;
        while (true) {
          const delta = (Math.random() - 0.48) * (currentPrice * 0.01);
          currentPrice = Math.round((currentPrice + delta) * 100) / 100;
          yield {
            stockPrice: {
              symbol: symbol.toUpperCase(),
              price: currentPrice,
              change: Math.round(delta * 100) / 100,
              timestamp: new Date().toISOString(),
            },
          };
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      },
    },
  },
};

export const schema = createSchema({
  typeDefs,
  resolvers,
});

export const yoga = createYoga({
  schema,
  graphqlEndpoint: '/graphql',
  graphiql: true,
});

export const schemaSdl = typeDefs;
