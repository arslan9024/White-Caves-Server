# White Caves — Core Backend Server & Services ⚙️

Backend platform, API, database layer, and real-time microservices powering the **White Caves Real Estate CRM & Property Ecosystem**.

---

## 🏛️ Architecture Overview

- **Runtime**: Node.js 22 LTS / TypeScript
- **API Framework**: Express.js with modular route architecture
- **Database Layer**: Prisma ORM with MongoDB
- **Real-Time Engine**: WebSockets (`ws` & Socket.IO)
- **Messaging & Outreach**: WhatsApp automation engines & Meta Webhooks
- **Edge Deployment**: Cloudflare Tunnel (`cloudflared`) to bridge local laptop development with Vercel frontend

---

## 📂 Repository Structure

```text
White-Caves-Server/
├── server/
│   ├── bootstrap/        # Lifecycle, authentication, middleware initialization
│   ├── config/           # CORS, database, connection pool, and security policies
│   ├── controllers/      # REST API controllers (leads, properties, leases, deals)
│   ├── middleware/       # RBAC, KYC verification, audit logging, CSRF, auth
│   ├── routes/           # Express API route declarations
│   ├── services/         # Business logic, AI assistants, WhatsApp engines
│   └── websocket/        # Realtime WebSocket channels
├── prisma/
│   ├── schema.prisma     # MongoDB Prisma models and relationships
│   ├── seed.ts           # Development seed data
│   └── migrations/       # Schema migrations
├── scripts/
│   ├── start-tunnel.ps1   # Cloudflare Tunnel runner for local hosting
│   └── server-watchdog.ps1# Health monitoring and auto-restart watchdog
├── secrets/              # Environment templates and credential maps (git-ignored)
├── Dockerfile.prod       # Containerized production deployment
└── nginx.conf            # Reverse proxy configuration
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your database URI:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` is set to your MongoDB instance:
```env
DATABASE_URL="mongodb://localhost:27017/white_caves?replicaSet=rs0"
PORT=5000
```

### 3. Generate Prisma Client
```bash
npm run prisma:generate
```

### 4. Run Development Server
```bash
npm run dev
```

The server will spin up on `http://localhost:5000`.

---

## 🌐 Cloudflare Tunnel Setup (Laptop Hosting)

To expose your local backend server securely to the Vercel-hosted frontend without opening router ports:

```powershell
npm run tunnel:start
```

This starts `cloudflared` and routes your custom domain (e.g., `https://api.whitecaves.ae`) directly to your local server on port 5000.

---

## 🛠️ Available Scripts

| Script | Purpose |
| :--- | :--- |
| `npm run dev` | Starts server with `tsx` hot-reloading |
| `npm run start` | Starts server in production mode |
| `npm run build` | Compiles TypeScript via `tsconfig.json` |
| `npm run prisma:generate` | Regenerates Prisma Client types |
| `npm run prisma:push` | Pushes Prisma schema updates to MongoDB |
| `npm run prisma:seed` | Seeds database with initial data |
| `npm run prisma:studio` | Opens Prisma GUI browser at `localhost:5555` |
| `npm run tunnel:start` | Launches Cloudflare tunnel bridge |
| `npm run watchdog:start` | Runs auto-recovery server watchdog |

---

## 🔒 Security & Compliance

- All secrets and credentials in `secrets/` are strictly excluded from version control via `.gitignore`.
- Role-based Access Control (RBAC) and Audit Logging are strictly enforced on all CRM mutating endpoints.
