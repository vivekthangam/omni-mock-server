# 🌐 OmniMock - Universal Multi-Protocol Mock & Sandbox Server

**OmniMock** is an all-in-one, multi-protocol mock, sandbox, and testbed server designed specifically to test API clients, testing tools, and developer platforms (such as **lux-api**, **Postman**, **Insomnia**, **SoapUI**, **grpcurl**, and **cURL**) across every modern and legacy communication protocol.

---

## 📋 Table of Contents
1. [Architecture & Protocol Support Matrix](#-architecture--protocol-support-matrix)
2. [How to Run (Step-by-Step Guide)](#-how-to-run-step-by-step-guide)
3. [Interactive Discovery & Dashboards](#-interactive-discovery--dashboards)
4. [Authentication & Security Testing Guide](#-authentication--security-testing-guide)
5. [Protocol & RPC Testing Guide](#-protocol--rpc-testing-guide)
   - [REST & Httpbin Suite](#1-rest--httpbin-suite)
   - [Dynamic Faker Mock Engine](#2-dynamic-faker-mock-data-engine)
   - [In-Memory Stateful CRUD Database Engine](#3-in-memory-stateful-crud-database-engine)
   - [Dynamic Custom Mock Rule Builder](#4-dynamic-custom-mock-rule-builder)
   - [Chaos Engineering & Fault Injection Engine](#5-chaos-engineering--fault-injection-engine)
   - [JSON-RPC 2.0 Engine](#6-json-rpc-20-engine)
   - [Server-Sent Events (SSE)](#7-server-sent-events-sse)
   - [Webhooks (Receiver, Inspector, Dispatcher)](#8-webhooks-receiver--dispatcher)
   - [GraphQL Yoga (Queries, Mutations, Subscriptions)](#9-graphql-yoga)
   - [SOAP 1.1 / 1.2 XML & WSDL](#10-soap-11--12-xml--wsdl)
   - [Native gRPC (Port 50051)](#11-native-grpc-http2--reflection)
   - [Raw WebSockets & Socket.IO](#12-raw-websockets--socketio)
6. [Exporting Collections (Postman & Lux-API)](#-exporting-collections)
7. [Structured Audit Logs & Observability](#-structured-audit-logs--observability)

---

## 🏛 Architecture & Protocol Support Matrix

| Protocol / Feature | Transport | Ports | Discovery / Specification | Supported Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **REST (Httpbin)** | HTTP/1.1, HTTP/2 | `3000` | OpenAPI 3.1 (`/docs`, `/openapi.json`) | All HTTP verbs, status codes, latency delays, chunked streams, drip feeds, gzip/deflate/brotli, multipart uploads, cookies |
| **Faker Engine** | HTTP JSON | `3000` | Swagger UI (`/docs`) | Users, products, finance (IBAN, masked CC), dynamic JSON schema builder |
| **Stateful DB Engine** | REST CRUD | `3000` | `/db` API & UI | In-memory CRUD on `/db/users`, `/db/products`, `/db/posts`, pagination, sorting, search, filtering |
| **Mock Rule Builder** | REST Interceptor | `3000` | `/mocks` API & UI | Create dynamic custom mock endpoints with Faker template evaluation, status codes, delays |
| **Chaos Engine** | HTTP Middleware | `3000` | `/chaos/config` | Header-driven latency (`X-Chaos-Delay`), error injection (`X-Chaos-Status`), connection drops (`X-Chaos-Drop-Rate`), payload corruption |
| **JSON-RPC 2.0** | HTTP POST | `3000` | `/rpc/json` | Single & batch calls, notifications, standard error codes, built-in methods |
| **Auth & Security** | HTTP Headers/Cookies | `3000` | Swagger UI + Discovery | Basic, Digest, JWT (HS256/RS256, expired), API Key, HMAC-SHA256, AWS SigV4 |
| **OAuth 2.0 / OIDC** | HTTP/1.1 | `3000` | `/.well-known/openid-configuration` | PKCE (`S256`/`plain`), Authorization Code, Client Credentials, Refresh Tokens, Password, Introspection, UserInfo, Consent UI |
| **Server-Sent Events** | `text/event-stream` | `3000` | Swagger UI / Web UI | Configurable intervals, continuous feeds, stock tickers, milestones, retry headers |
| **Webhooks** | HTTP Webhooks | `3000` | Webhook UI & API | Dynamic inbox generation, payload inspection, live WebSocket updates, outbound HMAC dispatcher, replay studio |
| **GraphQL** | HTTP & WebSocket | `3000` | GraphiQL (`/graphql`), SDL | Queries, Mutations, Subscriptions (SSE & `graphql-ws`), Faker-backed schemas |
| **gRPC & gRPC-Web** | HTTP/2 Native | `50051` | gRPC Server Reflection v1 | Unary, Server Streaming, Client Streaming, Bidirectional Streaming, `.proto` exports |
| **SOAP & XML** | HTTP XML | `3000` | WSDL (`/soap/service?wsdl`) | SOAP 1.1 & 1.2 envelopes, XML schema validation, automatic SOAP Fault generation |
| **Raw WebSocket** | `ws://` | `3000` | AsyncAPI / Web UI Studio | Echo, live ticker, broadcast chat room, binary frames, live audit stream |
| **Socket.IO** | WebSocket / Polling | `3000` | Web UI / Client tests | Namespaces (`/`, `/chat`), room subscriptions, acknowledgment callbacks, binary events |
| **Audit Logging** | In-Memory / SSE / WS | `3000` | `/audit/logs`, `/audit/stream` | Full request/response capture, latency metrics, filter by protocol/status |


---

## 🚀 How to Run (Step-by-Step Guide)

### 📋 Prerequisites
Before running OmniMock, ensure you have **one** of the following runtime options installed on your system:
- **Option A (Node.js / PNPM)**: [Node.js](https://nodejs.org/) (v18 or higher) and [PNPM](https://pnpm.io/) (`npm install -g pnpm` or `corepack enable`).
- **Option B (Podman)**: [Podman](https://podman.io/) (and optionally `podman-compose`).
- **Option C (Docker)**: [Docker Desktop](https://www.docker.com/) / Docker Engine and Docker Compose.

---

### Method 1: Local Development with PNPM (Hot-Reload)

Best for active local development with instant TypeScript reload:

```bash
# 1. Navigate to the project directory
cd apps/omni-mock-server

# 2. Install all dependencies (use --ignore-scripts if workspace asks for approval)
pnpm install

# 3. Start development server with auto-reload (ts-node-dev)
pnpm run dev
```

> **💡 Note on PNPM Workspaces (`[ERR_PNPM_IGNORED_BUILDS]`)**:
> If your PNPM workspace prompts with `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: @scarf/scarf`, you can either:
> 1. Run `pnpm install --ignore-scripts` (or the included `.npmrc` will bypass unnecessary telemetry scripts).
> 2. Or run `pnpm approve-builds` to approve or ignore dependencies in the workspace.


The server will start and print:
```text
🚀 OmniMock Server running on http://localhost:3000
📖 Swagger OpenAPI Docs: http://localhost:3000/docs
⚡ GraphiQL Playground: http://localhost:3000/graphql
📜 SOAP WSDL: http://localhost:3000/soap/service?wsdl
[gRPC] Native gRPC Server running on 0.0.0.0:50051
```

---

### Method 2: Local Production Build & Run with PNPM

Best for running compiled production JavaScript locally:

```bash
cd apps/omni-mock-server

# 1. Install dependencies
pnpm install

# 2. Compile TypeScript to JavaScript (dist/)
pnpm run build

# 3. Start compiled production server
pnpm start
```

---

### Method 3: Containerized with Podman

Podman is a daemonless, rootless container engine.

#### Using Podman CLI:
```bash
cd apps/omni-mock-server

# 1. Build container image using Containerfile
podman build -t omnimock-server -f Containerfile .

# 2. Run container in background (mapping port 3000 for HTTP/WS and 50051 for gRPC)
podman run -d --name omnimock -p 3000:3000 -p 50051:50051 omnimock-server

# 3. View container logs
podman logs -f omnimock

# 4. Stop and remove container
podman stop omnimock
podman rm omnimock
```

#### Using Podman Compose:
```bash
cd apps/omni-mock-server

# Start in background
podman-compose up -d

# View live logs
podman-compose logs -f

# Stop containers
podman-compose down
```

---

### Method 4: Containerized with Docker

#### Using Docker CLI:
```bash
cd apps/omni-mock-server

# 1. Build container image
docker build -t omnimock-server .

# 2. Run container
docker run -d --name omnimock -p 3000:3000 -p 50051:50051 omnimock-server

# 3. View logs
docker logs -f omnimock

# 4. Stop container
docker stop omnimock && docker rm omnimock
```

#### Using Docker Compose:
```bash
cd apps/omni-mock-server

# Build & launch container
docker compose up -d

# Check status & logs
docker compose logs -f

# Stop and clean up
docker compose down
```

---

### ⚙️ Environment Configuration

You can customize port allocations and secrets via environment variables or a `.env` file:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP port for REST, GraphQL, SOAP, WebSockets, Socket.IO, SSE, Webhooks, and Web UI |
| `GRPC_PORT` | `50051` | Native gRPC (HTTP/2) port |
| `HTTPS_PORT` | `8443` | Optional mTLS / HTTPS testing port |
| `JWT_SECRET` | `omnimock-super-secret-jwt-key-change-me` | Secret key used to sign and verify HMAC / Bearer JWT tokens |
| `NODE_ENV` | `development` | Set to `production` in container builds |

Example `.env` file:

```env
PORT=3000
GRPC_PORT=50051
JWT_SECRET=my-custom-secure-jwt-secret-key
NODE_ENV=production
```

---

### 🩺 Verify Server Health

Once running, verify the server is responding by running:

```bash
# Verify REST HTTP server:
curl http://localhost:3000/rest/get

# Verify OpenAPI documentation:
curl http://localhost:3000/openapi.json

# Verify gRPC server reflection:
grpcurl -plaintext localhost:50051 list
```

If you see the JSON echo and service lists, OmniMock is fully up and operational!

---


## 🔍 Interactive Discovery & Dashboards

- **Web Dashboard & Live Audit Stream**: [http://localhost:3000/](http://localhost:3000/)
- **Swagger / OpenAPI 3.1 UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **OpenAPI 3.1 JSON Specification**: [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json)
- **GraphiQL Playground**: [http://localhost:3000/graphql](http://localhost:3000/graphql)
- **SOAP WSDL Schema**: [http://localhost:3000/soap/service?wsdl](http://localhost:3000/soap/service?wsdl)
- **OAuth 2.0 / OIDC Discovery**: [http://localhost:3000/.well-known/openid-configuration](http://localhost:3000/.well-known/openid-configuration)
- **Native gRPC Service**: `localhost:50051` (with gRPC Reflection enabled)

---

## 🔐 Authentication & Security Testing Guide

### 1. Bearer JWT (JSON Web Token)

#### A. Generate a New JWT Token
```bash
curl -X POST http://localhost:3000/auth/jwt/token \
  -H "Content-Type: application/json" \
  -d '{
    "sub": "user_456",
    "name": "Jane Developer",
    "email": "jane@example.com",
    "role": "admin",
    "scopes": ["read:users", "write:users", "admin:all"]
  }'
```
**Sample Response:**
```json
{
  "token_type": "Bearer",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "payload": {
    "sub": "user_456",
    "name": "Jane Developer",
    "role": "admin"
  }
}
```

#### B. Generate an Expired Token (for client error testing)
```bash
curl -X POST http://localhost:3000/auth/jwt/expired
```

#### C. Validate Bearer Token
```bash
curl -X GET http://localhost:3000/auth/jwt/protected \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

#### Postman Setup:
1. Open request -> Go to the **Authorization** tab.
2. Select **Type**: `Bearer Token`.
3. Paste the generated `access_token` into the **Token** field.
4. Send request to `http://localhost:3000/auth/jwt/protected`.

#### Insomnia Setup:
1. Open request -> Click **Auth** dropdown -> Select **Bearer Token**.
2. Paste the `access_token` into the **TOKEN** field.
3. Send request to `http://localhost:3000/auth/jwt/protected`.

---

### 2. OAuth 2.0 / OpenID Connect (OIDC)

#### A. Client Credentials Grant
```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=my_client&client_secret=secret123&scope=read write"
```

#### B. Resource Owner Password Grant
```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&username=admin&password=password123&client_id=my_client&scope=openid profile"
```

#### C. Authorization Code Flow with PKCE
1. **Authorize in Browser or App**:
   `http://localhost:3000/oauth/authorize?response_type=code&client_id=lux_app&redirect_uri=http://localhost:3000/rest/get&scope=openid profile email&code_challenge=E9Melhoa2OwvFrGMTJguCH5ZiXVupWhBatBoom7afeI&code_challenge_method=S256`
2. **Exchange Code for Tokens**:
   ```bash
   curl -X POST http://localhost:3000/oauth/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=<CODE>&client_id=lux_app&redirect_uri=http://localhost:3000/rest/get&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
   ```

#### D. Fetch OIDC UserInfo
```bash
curl -X GET http://localhost:3000/oauth/userinfo \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

#### E. Token Introspection (RFC 7662)
```bash
curl -X POST http://localhost:3000/oauth/introspect \
  -H "Content-Type: application/json" \
  -d '{"token": "<YOUR_ACCESS_TOKEN>"}'
```

#### Postman OAuth 2.0 Setup:
1. In the **Authorization** tab, select **Type**: `OAuth 2.0`.
2. **Grant Type**: `Authorization Code (With PKCE)` or `Client Credentials`.
3. **Auth URL**: `http://localhost:3000/oauth/authorize`
4. **Access Token URL**: `http://localhost:3000/oauth/token`
5. **Client ID**: `lux-client`
6. **Client Secret**: `lux-secret`
7. **Scope**: `openid profile email`
8. Click **Get New Access Token**.

#### Insomnia OAuth 2.0 Setup:
1. In the **Auth** tab, select **OAuth 2.0**.
2. **Grant Type**: `Authorization Code` or `Client Credentials`.
3. **Authorization URL**: `http://localhost:3000/oauth/authorize`
4. **Access Token URL**: `http://localhost:3000/oauth/token`
5. **Client ID**: `lux-client`
6. Click **Fetch Tokens**.

---

### 3. HTTP Basic Authentication

```bash
# Direct URL authentication
curl -X GET http://localhost:3000/auth/basic/admin/password -u admin:password

# Or with Authorization header:
curl -X GET http://localhost:3000/auth/basic \
  -H "Authorization: Basic YWRtaW46cGFzc3dvcmQ="
```

#### Postman / Insomnia Setup:
- Select **Basic Auth**, enter Username `admin` and Password `password`.

---

### 4. HTTP Digest Authentication (RFC 7616)

```bash
curl --digest -u user1:pass1 http://localhost:3000/auth/digest/auth/user1/pass1
```

#### Postman Setup:
- Select **Digest Auth**, enter Username `user1`, Password `pass1`, Realm `OmniMock Digest Realm`. Postman automatically handles the 401 nonce challenge handshake.

---

### 5. API Key (Header / Query / Cookie)

Expected test key: `omnimock_secret_api_key_xyz987`

```bash
# 1. Header:
curl -X GET http://localhost:3000/auth/apikey/header \
  -H "X-API-Key: omnimock_secret_api_key_xyz987"

# 2. Query Param:
curl -X GET "http://localhost:3000/auth/apikey/query?api_key=omnimock_secret_api_key_xyz987"

# 3. Cookie:
curl -X GET http://localhost:3000/auth/apikey/cookie \
  --cookie "api_key=omnimock_secret_api_key_xyz987"
```

#### Postman / Insomnia Setup:
- Select **API Key**, Key: `X-API-Key`, Value: `omnimock_secret_api_key_xyz987`, Add to: `Header`.

---

### 6. HMAC-SHA256 Signature Verification

```bash
# Body: {"event":"payment_success"}
# Shared Secret: omnimock_shared_hmac_secret
curl -X POST http://localhost:3000/auth/hmac \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=1bc22752184d081f9a0cfa5e2bb33f6771d9dbe39f82ecba472be69a19c9918b" \
  -d '{"event":"payment_success"}'
```

---

### 7. AWS Signature Version 4 (AWS-SigV4)

```bash
curl -X GET http://localhost:3000/auth/aws-sigv4 \
  -H "Authorization: AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20260919/us-east-1/execute-api/aws4_request, SignedHeaders=host;x-amz-date, Signature=fe5f80f7793fa1bec5da1a8515920373b06bc82d4822d3cf3ea30e8bc6add386" \
  -H "X-Amz-Date: 20260919T120000Z"
```

#### Postman Setup:
- Select **AWS Signature**, AccessKey `AKIAIOSFODNN7EXAMPLE`, SecretKey `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`, Region `us-east-1`, Service Name `execute-api`.

---

## 📡 Protocol & RPC Testing Guide

### 1. REST & Httpbin Suite

```bash
# 1. Echo GET request (args, headers, origin IP)
curl -X GET "http://localhost:3000/rest/get?category=cloud&limit=20"

# 2. Echo POST request with JSON
curl -X POST http://localhost:3000/rest/post \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "isActive": true}'

# 3. Dynamic HTTP Status Code testing
curl -i -X GET http://localhost:3000/rest/status/429
curl -i -X GET http://localhost:3000/rest/status/503

# 4. Response delay simulation (1500ms latency)
curl -X GET http://localhost:3000/rest/delay/1500

# 5. Stream newline-delimited JSON chunks (ndjson)
curl -N http://localhost:3000/rest/stream/10

# 6. Drip chunked byte stream
curl -N "http://localhost:3000/rest/drip?duration=3&numbytes=20"

# 7. Random Binary bytes generator
curl -X GET http://localhost:3000/rest/bytes/1024 --output test.bin

# 8. Multipart Form-Data File Upload
curl -X POST http://localhost:3000/rest/upload/multipart \
  -F "username=tester" \
  -F "file=@README.md"
```

---

### 2. Dynamic Faker Mock Data Engine

```bash
# Generate 10 realistic users (UUID, avatars, emails, addresses)
curl -X GET "http://localhost:3000/faker/users?count=10"

# Generate 5 realistic e-commerce products
curl -X GET "http://localhost:3000/faker/products?count=5"

# Generate banking & financial records (IBAN, masked CC, crypto addresses)
curl -X GET "http://localhost:3000/faker/finance?count=5"

# Dynamic custom schema generation on-the-fly
curl -X POST http://localhost:3000/faker/custom \
  -H "Content-Type: application/json" \
  -d '{
    "count": 3,
    "schema": {
      "id": "string.uuid",
      "fullName": "person.fullName",
      "email": "internet.email",
      "creditCard": "finance.creditCardNumber",
      "city": "location.city",
      "company": "company.name"
    }
  }'
```

---

### 3. Server-Sent Events (SSE)

```bash
# 1. Continuous events stream with milestone events
curl -N -H "Accept: text/event-stream" "http://localhost:3000/sse/events?interval=500&count=20"

# 2. Real-time fluctuating stock ticker stream
curl -N -H "Accept: text/event-stream" http://localhost:3000/sse/stocks
```

---

### 4. Webhooks (Receiver & Dispatcher)

```bash
# 1. Create a new Webhook Inbox
curl -X POST http://localhost:3000/webhooks/inboxes
# -> Returns: {"inboxId": "a1b2c3d4", "webhookUrl": "/webhooks/inbox/a1b2c3d4"}

# 2. Send any HTTP request/webhook to that inbox
curl -X POST http://localhost:3000/webhooks/inbox/a1b2c3d4 \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Event: order.fulfilled" \
  -d '{"orderId": "ord_999", "amount": 149.99}'

# 3. Inspect all received payloads for that inbox
curl -X GET http://localhost:3000/webhooks/inbox/a1b2c3d4/requests

# 4. Outbound Webhook Dispatcher simulator
curl -X POST http://localhost:3000/webhooks/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "http://localhost:3000/webhooks/inbox/a1b2c3d4",
    "secret": "my_webhook_secret",
    "payload": {"event": "subscription.renewed", "plan": "enterprise"}
  }'
```

---

### 5. GraphQL Yoga

- Interactive IDE: [http://localhost:3000/graphql](http://localhost:3000/graphql)

#### A. Postman / Insomnia GraphQL Request:
- **URL**: `http://localhost:3000/graphql`
- **Method**: `POST`
- **Query**:
```graphql
query GetStoreData {
  users(limit: 3) {
    id
    name
    email
    role
  }
  products(limit: 2) {
    id
    title
    price
    inStock
  }
}

mutation AddUser {
  createUser(name: "John Developer", email: "john@example.com", role: "ADMIN") {
    id
    name
    email
  }
}

subscription OnLiveOrders {
  liveOrder {
    id
    totalAmount
    status
    createdAt
  }
}
```

#### B. GraphQL via cURL:
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users(limit: 2) { id name email role } }"}'
```

---

### 6. SOAP 1.1 / 1.2 XML & WSDL

- **WSDL Schema Download**: [http://localhost:3000/soap/service?wsdl](http://localhost:3000/soap/service?wsdl)

#### A. Send SOAP Request via cURL:
```bash
curl -X POST http://localhost:3000/soap/service \
  -H "Content-Type: text/xml; charset=utf-8" \
  -H "SOAPAction: GetUserDetails" \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://omnimock.local/soap/service">
  <soap:Body>
    <tns:GetUserDetailsRequest>
      <userId>usr_555</userId>
    </tns:GetUserDetailsRequest>
  </soap:Body>
</soap:Envelope>'
```

#### B. Postman / Insomnia Setup:
1. Set method to `POST`, URL: `http://localhost:3000/soap/service`.
2. Set Header: `Content-Type: text/xml; charset=utf-8` and `SOAPAction: GetUserDetails`.
3. Set Body (Raw XML) to the envelope above.

---

### 7. Native gRPC (HTTP/2 & Reflection)

Port `50051` hosts the native HTTP/2 gRPC server with Server Reflection enabled.

#### A. In Postman:
1. Click **New** -> **gRPC Request**.
2. URL: `localhost:50051`.
3. Select **Use Server Reflection** -> Postman will introspect `omnimock.v1.TestService` and all RPC methods (`UnaryEcho`, `GetUser`, `StreamTicks`, `RecordMetrics`, `ChatStream`).
4. Select `UnaryEcho`, payload: `{"message": "Hello from Postman!"}`, click **Invoke**.

#### B. Using `grpcurl`:
```bash
# 1. List services via Server Reflection
grpcurl -plaintext localhost:50051 list

# 2. Describe TestService methods
grpcurl -plaintext localhost:50051 describe omnimock.v1.TestService

# 3. Unary Echo Call
grpcurl -plaintext -d '{"message": "Testing gRPC"}' localhost:50051 omnimock.v1.TestService/UnaryEcho

# 4. Server Streaming Call
grpcurl -plaintext -d '{"count": 5, "interval_ms": 500}' localhost:50051 omnimock.v1.TestService/StreamTicks
```

---

### 8. Raw WebSockets (`ws://`)

In Postman or Insomnia WebSocket tab:
- **Echo Channel**: `ws://localhost:3000/ws/echo` (send text or binary data)
- **Live Ticker**: `ws://localhost:3000/ws/ticker` (receives real-time price updates)
- **Broadcast Chat**: `ws://localhost:3000/ws/chat` (broadcasts messages across all connected clients)
- **Live Audit Stream**: `ws://localhost:3000/ws/audit` (receives live JSON audit records of all incoming traffic)

---

### 9. Socket.IO (v4)

- **URL**: `http://localhost:3000`
- **Path**: `/socket.io/`
- **Namespaces**: `/` and `/chat`
- **Acknowledgment Callbacks**: Emit `ping_with_ack` with payload `{"test": true}` to receive server callback with server timestamp.
- **Rooms**: Emit `join_room` with room name and `room_message`.

---

## 📊 Structured Audit Logs & Observability

Every interaction across all protocols is structured and recorded:

```bash
# 1. Query recorded audit logs (with pagination)
curl -X GET "http://localhost:3000/audit/logs?limit=25"

# 2. Filter by Protocol (REST, GRAPHQL, GRPC, SOAP, WEBSOCKET, SSE, WEBHOOK, OAUTH, AUTH)
curl -X GET "http://localhost:3000/audit/logs?protocol=GRAPHQL"

# 3. Search logs by keyword
curl -X GET "http://localhost:3000/audit/logs?search=admin"

# 4. Stream audit logs live via SSE
curl -N http://localhost:3000/audit/stream

# 5. Clear audit log buffer
curl -X DELETE http://localhost:3000/audit/logs
```

---

## 📄 License
MIT License. Built for universal API protocol testing and developer tooling.
