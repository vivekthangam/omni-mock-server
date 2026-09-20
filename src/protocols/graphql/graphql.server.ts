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

  type Query {
    hello(name: String): String!
    users(limit: Int): [User!]!
    user(id: ID!): User
    products(category: String, limit: Int): [Product!]!
    orders(limit: Int): [Order!]!
  }

  type Mutation {
    createUser(name: String!, email: String!, role: String): User!
    createProduct(title: String!, price: Float!, category: String!): Product!
  }

  type Subscription {
    liveOrder: Order!
    countdown(from: Int!): Int!
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

function fakeProduct(id?: string) {
  return {
    id: id || faker.string.uuid(),
    title: faker.commerce.productName(),
    price: parseFloat(faker.commerce.price({ min: 10, max: 500 })),
    category: faker.commerce.department(),
    inStock: faker.datatype.boolean(),
  };
}

function fakeOrder() {
  const products = [fakeProduct(), fakeProduct()];
  return {
    id: faker.string.uuid(),
    user: fakeUser(),
    products,
    totalAmount: products.reduce((acc, p) => acc + p.price, 0),
    status: faker.helpers.arrayElement(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']),
    createdAt: new Date().toISOString(),
  };
}

const resolvers = {
  Query: {
    hello: (_: any, { name }: { name?: string }) => `Hello ${name || 'World'} from OmniMock GraphQL!`,
    users: (_: any, { limit = 5 }: { limit?: number }) => Array.from({ length: limit }, () => fakeUser()),
    user: (_: any, { id }: { id: string }) => fakeUser(id),
    products: (_: any, { limit = 5 }: { limit?: number }) => Array.from({ length: limit }, () => fakeProduct()),
    orders: (_: any, { limit = 3 }: { limit?: number }) => Array.from({ length: limit }, () => fakeOrder()),
  },
  Mutation: {
    createUser: (_: any, { name, email, role }: any) => {
      const user = {
        id: faker.string.uuid(),
        name,
        email,
        role: role || 'USER',
        avatar: faker.image.avatar(),
      };
      auditService.record({
        protocol: 'GRAPHQL',
        method: 'MUTATION createUser',
        path: '/graphql',
        requestBody: { name, email, role },
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
