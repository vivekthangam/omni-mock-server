# Stage 1: Build stage with PNPM
FROM node:20-alpine AS builder

WORKDIR /app

# Install PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependency specifications
COPY package.json ./

# Install all dependencies (including devDependencies for TypeScript build)
RUN pnpm install

# Copy source code and definitions
COPY tsconfig.json ./
COPY proto/ ./proto/
COPY wsdl/ ./wsdl/
COPY src/ ./src/

# Compile TypeScript
RUN pnpm run build

# Copy static assets into dist
RUN mkdir -p dist/ui/public && cp -r src/ui/public/* dist/ui/public/

# Stage 2: Minimal Production Image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV GRPC_PORT=50051

# Install PNPM for production install
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json ./
RUN pnpm install --prod

# Copy built code and assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/proto ./proto
COPY --from=builder /app/wsdl ./wsdl

# Expose ports:
# 3000: Main HTTP/REST/GraphQL/WS/SocketIO/SOAP/Swagger/Audit UI
# 50051: Native gRPC (HTTP/2)
EXPOSE 3000
EXPOSE 50051

CMD ["node", "dist/server.js"]
