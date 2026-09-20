# 🚀 100% Free Cloud Deployment & Free DNS Guide

This guide explains step-by-step how to host **OmniMock** in the cloud **100% for free** with automatic **HTTPS / SSL** and how to point any **free custom domain / DNS** to it.

---

## 🏆 Top 100% Free Hosting Options

| Platform | Free Tier Specs | Custom Domain Support | Free Subdomain Provided | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **1. Render.com** | 512MB RAM, 750 free hrs/mo | ✅ Unlimited Custom Domains + Free SSL | `*.onrender.com` | **Easiest 1-Click Git Deploy** |
| **2. Koyeb** | 512MB RAM, Global Edge | ✅ Custom Domains + Free Let's Encrypt | `*.koyeb.app` | **Native Docker / Git** |
| **3. Fly.io** | 3 shared-cpu VMs, 256MB RAM | ✅ Custom Domains + Auto TLS | `*.fly.dev` | **Global Edge Containers** |
| **4. Oracle Cloud** | 4 ARM Cores, 24GB RAM, 200GB Disk | ✅ Full IP + Complete Root Control | Assign any A/AAAA Record | **Power Users (Always Free VPS)** |

---

## Option 1: Deploy to Render.com (Recommended - Easiest & Free)

Render allows deploying Docker or Node.js web services directly from GitHub for free.

### Step 1: Push your repo to GitHub
```bash
git add .
git commit -m "Add OmniMock server"
git push origin main
```

### Step 2: Create Free Web Service on Render
1. Go to [https://render.com/](https://render.com/) and sign up (Free).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Root Directory**: `apps/omni-mock-server`
   - **Runtime**: `Docker` (or `Node`)
   - **Plan**: `Free` ($0/month)
5. Click **Create Web Service**.

Render will automatically build the `Dockerfile` and give you a live URL:
`https://omnimock-server.onrender.com`

---

## Option 2: Deploy to Koyeb (Free Tier)

1. Sign up at [https://www.koyeb.com/](https://www.koyeb.com/).
2. Click **Create Service** -> Select **GitHub**.
3. Choose your repository and set work directory to `apps/omni-mock-server`.
4. Select **Builder**: `Dockerfile`.
5. Select **Instance Type**: `Nano (Free)`.
6. Click **Deploy**.

You will receive an active HTTPS URL like:
`https://omnimock-yourname.koyeb.app`

---

## Option 3: Deploy to Fly.io (Free Tier)

Fly.io runs lightweight containers close to your users.

```bash
# 1. Install flyctl
# Windows (PowerShell):
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
# Mac/Linux:
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Navigate and launch from fly.toml
cd apps/omni-mock-server
fly launch --now
```

Your server will be live at `https://omnimock-server.fly.dev`!

---

## Option 4: Oracle Cloud "Always Free" VPS

Oracle Cloud provides **4 Ampere A1 ARM CPU cores and 24GB RAM** completely free forever.

1. Create an Always Free account at [https://www.oracle.com/cloud/free/](https://www.oracle.com/cloud/free/).
2. Launch an **Ubuntu 22.04 ARM Compute Instance**.
3. SSH into your VPS:
   ```bash
   ssh ubuntu@<YOUR_VPS_PUBLIC_IP>
   ```
4. Install Docker & Podman:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose
   ```
5. Clone and run OmniMock:
   ```bash
   git clone <YOUR_REPO_URL>
   cd lux-dev/apps/omni-mock-server
   sudo docker compose up -d
   ```
6. Open ports `80`, `443`, `3000`, `50051` in Oracle Cloud Security Lists.

---

## 🌐 How to Connect a Free Custom Domain & DNS

### 1. Free Domain Options:
- **`is-a.dev`** (Free subdomain for developers): [https://is-a.dev/](https://is-a.dev/) (e.g. `omnimock.is-a.dev`).
- **`DuckDNS`** (Free dynamic DNS): [https://www.duckdns.org/](https://www.duckdns.org/) (e.g. `omnimock.duckdns.org`).
- **`FreeDNS (afraid.org)`**: [https://freedns.afraid.org/](https://freedns.afraid.org/).
- Or any standard top-level domain (`.com`, `.dev`, `.net`) from Namecheap, Porkbun, or Cloudflare.

---

### 2. Connect Your Domain with Cloudflare (Free DNS + Free SSL)

Cloudflare provides 100% free DNS management, DDoS protection, edge caching, and automated SSL/TLS certificates.

#### Step 1: Add Domain to Cloudflare
1. Sign up at [https://dash.cloudflare.com/](https://dash.cloudflare.com/) (Free plan).
2. Click **Add a Site** and enter your domain name.
3. Change your domain's Nameservers at your registrar to Cloudflare's nameservers.

#### Step 2: Add DNS Records in Cloudflare
Go to **DNS** -> **Records** -> **Add Record**:

- **If hosting on Render.com**:
  - **Type**: `CNAME`
  - **Name**: `api` (or `@` for root)
  - **Target**: `omnimock-server.onrender.com`
  - **Proxy Status**: `Proxied (Orange Cloud)`

- **If hosting on Fly.io**:
  - **Type**: `CNAME`
  - **Name**: `api`
  - **Target**: `omnimock-server.fly.dev`
  - **Proxy Status**: `Proxied (Orange Cloud)`

- **If hosting on Oracle VPS**:
  - **Type**: `A`
  - **Name**: `@` or `api`
  - **IPv4 address**: `<YOUR_VPS_PUBLIC_IP>`
  - **Proxy Status**: `Proxied (Orange Cloud)`

#### Step 3: Enable Full SSL in Cloudflare
1. Go to **SSL/TLS** tab in Cloudflare.
2. Select encryption mode: **Full** or **Flexible**.
3. Under **Edge Certificates**, turn on **Always Use HTTPS**.

---

## 🎉 Verification

Your OmniMock server is now accessible globally on your free domain with automated HTTPS:

- **Web Dashboard**: `https://api.yourdomain.com/`
- **Swagger UI Docs**: `https://api.yourdomain.com/docs`
- **GraphQL IDE**: `https://api.yourdomain.com/graphql`
- **REST APIs**: `https://api.yourdomain.com/rest/get`
- **Mock DB**: `https://api.yourdomain.com/db/users`
- **Postman Collection Download**: `https://api.yourdomain.com/export/postman`
