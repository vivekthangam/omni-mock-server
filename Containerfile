# Containerfile for Podman Build
FROM node:20-alpine AS builder

WORKDIR /app

# Enable PNPM
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json ./
RUN pnpm install

COPY tsconfig.json ./
COPY proto/ ./proto/
COPY wsdl/ ./wsdl/
COPY src/ ./src/

RUN pnpm run build
RUN mkdir -p dist/ui/public && cp -r src/ui/public/* dist/ui/public/

# Runner Image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV GRPC_PORT=50051

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json ./
RUN pnpm install --prod

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/proto ./proto
COPY --from=builder /app/wsdl ./wsdl

EXPOSE 3000
EXPOSE 50051

CMD ["node", "dist/server.js"]
