# DataPilot Backend

API and infrastructure for **DataPilot AI** — an AI-native data intelligence platform.

> **Note:** This repo contains foundational scaffolding only. Endpoints return placeholder responses until business logic is implemented.

## Stack

| Technology | Purpose |
|------------|---------|
| Node.js + TypeScript | Runtime |
| Fastify | HTTP API |
| Prisma + PostgreSQL | Relational data (SQL) |
| Redis + BullMQ | Job queues |
| Qdrant | Vector store (placeholder) |
| Docker Compose | Local infrastructure |

---

## Deployment note

There is **no reverse proxy** in this repo. Locally, the frontend (`:3000`) and API (`:3001`) run as separate services. In production, route traffic at **GCP** (Cloud Load Balancing, Cloud Run custom domains, API Gateway, etc.).

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- Node.js 22+ (for local API / Prisma Studio)
- npm

---

## Setup

### Option A — Full stack with Docker (recommended)

```bash
cd datapilot-backend
cp .env.example .env
docker compose up --build
```

Wait until containers are healthy, then verify:

```bash
curl http://localhost:3001/api/health
```

### Option B — Local API + Docker infrastructure

Use this when you want hot reload on the API and worker.

```bash
# 1. Start databases & queues only
docker compose up postgres redis qdrant -d

# 2. Configure environment
cp .env.example .env
# .env already uses localhost — required for Prisma Studio & npm run dev

# 3. Install & migrate
npm install
npm run prisma:generate
npm run prisma:migrate

# 4. Terminal 1 — API
npm run dev

# 5. Terminal 2 — BullMQ worker
npm run dev:worker
```

### Port conflicts

If `6379` or `6333` are already in use on your machine, `docker-compose.yml` maps:

| Service | Host port |
|---------|-----------|
| Redis | **6380** |
| Qdrant | **6335** (REST), **6336** (gRPC) |

Update `.env` accordingly (`REDIS_PORT=6380`, `QDRANT_URL=http://localhost:6335`).

---

## Service URLs

| Service | URL | Notes |
|---------|-----|-------|
| **API** | http://localhost:3001 | Fastify — base path `/api` |
| **PostgreSQL** | `localhost:5432` | User/pass/db: `datapilot` |
| **Prisma Studio** | http://localhost:5555 | Run `npm run prisma:studio` |
| **Redis** | `localhost:6380` | Host-mapped port |
| **Qdrant dashboard** | http://localhost:6335/dashboard | Web UI |
| **Frontend (Docker)** | http://localhost:3000 | From sibling repo build |

### Database connection string

```
postgresql://datapilot:datapilot@localhost:5432/datapilot?schema=public
```

Inside Docker containers, Compose overrides `DATABASE_URL` to use hostname `postgres`.

---

## API Endpoints

Base URL (local): `http://localhost:3001/api`

> **Production (GCP):** Use your GCP load balancer / ingress URL. No reverse proxy is bundled in this repo.

All module routes currently return placeholder JSON, e.g.:

```json
{ "data": [], "message": "Dataset module placeholder" }
```

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness — API is up |
| `GET` | `/api/health/ready` | Readiness — checks Postgres + Redis |

**Example — liveness**

```bash
curl http://localhost:3001/api/health
```

```json
{
  "status": "ok",
  "service": "datapilot-backend",
  "timestamp": "2026-05-19T15:46:55.801Z"
}
```

**Example — readiness**

```bash
curl http://localhost:3001/api/health/ready
```

```json
{
  "status": "ready",
  "checks": { "database": "ok", "redis": "ok" },
  "timestamp": "2026-05-19T15:46:55.824Z"
}
```

### Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List users (placeholder) |
| `GET` | `/api/users/:id` | Get user by ID (placeholder) |

### Datasets

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/datasets` | List datasets (placeholder) |
| `GET` | `/api/datasets/:id` | Get dataset by ID (placeholder) |

### Uploads

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/uploads` | List uploads (placeholder) |
| `POST` | `/api/uploads` | Create upload (placeholder) |

### AI

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ai/conversations` | List conversations (placeholder) |
| `POST` | `/api/ai/conversations` | Create conversation (placeholder) |
| `POST` | `/api/ai/query` | Submit AI query (placeholder) |

### Reports

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/reports` | List reports (placeholder) |
| `GET` | `/api/reports/:id` | Get report by ID (placeholder) |

---

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Description | Local default |
|----------|-------------|---------------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | API port | `3001` |
| `HOST` | Bind address | `0.0.0.0` |
| `LOG_LEVEL` | Pino log level | `info` |
| `DATABASE_URL` | Postgres connection | `localhost:5432` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6380` |
| `QDRANT_URL` | Qdrant HTTP URL | `http://localhost:6335` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with hot reload |
| `npm run dev:worker` | Start BullMQ worker with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled API |
| `npm run worker` | Run compiled worker |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Apply migrations (dev) |
| `npm run prisma:studio` | Open Prisma Studio UI |

---

## Job processing

```
API (Fastify)  →  BullMQ queue (Redis)  →  Node worker
   enqueue           data-processing          process job
```

- Queue name: `data-processing`
- Worker entry: `src/worker.ts`
- Processor: `src/workers/processors/data-processing.processor.ts`

---

## Project structure

```
src/
├── server.ts              # API entry
├── worker.ts              # BullMQ worker entry
├── app.ts                 # Fastify factory
├── config/                # env, logger, queue
├── plugins/               # prisma, redis, bullmq
├── routes/                # health + registration
├── modules/
│   ├── users/
│   ├── datasets/
│   ├── uploads/
│   ├── ai/
│   └── reports/
├── services/              # qdrant placeholder
└── workers/
    └── processors/
prisma/
├── schema.prisma
└── migrations/
docker-compose.yml
```

---

## Database models (Prisma)

| Model | Description |
|-------|-------------|
| `User` | Platform users |
| `Dataset` | Data collections (belongs to user) |
| `UploadedFile` | Files linked to a dataset |
| `AIConversation` | Chat sessions (belongs to user) |
| `AIQuery` | Messages in a conversation |

Tables are created via `prisma migrate` on startup (Docker) or `npm run prisma:migrate` (local).

---

## Troubleshooting

### Prisma Studio: "Unable to run script"

Ensure `.env` uses **`localhost`**, not `postgres`:

```
DATABASE_URL=postgresql://datapilot:datapilot@localhost:5432/datapilot?schema=public
```

Then restart: `npm run prisma:studio`

### Docker: port already allocated

Another project may be using 6379 or 6333. Use the mapped ports in `docker-compose.yml` (6380, 6335) or stop conflicting containers:

```bash
docker ps
```

### API not reachable

```bash
docker compose ps
docker compose logs backend
curl http://localhost:3001/api/health
```

### Stop all services

```bash
docker compose down
```

---

## Related repo

Frontend (separate git repo): [`datapilot-frontend`](../datapilot-frontend) — sibling folder, push independently to GitHub.
