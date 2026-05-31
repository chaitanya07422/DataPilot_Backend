# DataPilot Backend

API, job processing, and infrastructure for **DataPilot AI**.

## What's implemented

| Area | Status | Notes |
|------|--------|-------|
| Health checks | Live | Liveness + Postgres/Redis readiness |
| Datasets CRUD (list, create, get) | Live | Scoped to `DEV_USER_ID` |
| Multipart file upload | Live | Local disk (`UPLOAD_DIR`) |
| BullMQ job queue | Live | Queue: `data-processing` |
| Bull Board dashboard | Live | http://localhost:3001/admin/queues |
| Document pipeline | Live | PDF, TXT, MD → parse → chunk → embed → Qdrant |
| Tabular pipeline | Live | CSV, XLSX → parse → clean → Postgres rows → embed → Qdrant |
| Auto-clean on upload | Live | Default cleaning profile applied |
| Manual re-clean | Live | `POST .../clean` with `CleaningOptions` |
| Cleaning reports | Live | Stored in `cleaning_reports` |
| Local embeddings | Live | `@xenova/transformers` (384-dim MiniLM) |
| Users module | Placeholder | Returns empty placeholder JSON |
| AI module | Placeholder | Conversations / query stubs |
| Reports module | Placeholder | List / get stubs |
| Authentication | Not started | Single dev user from seed |

### Processing pipeline

```
Upload (API) → save file + Postgres record → enqueue BullMQ job
     ↓
Worker:
  Tabular (CSV/XLSX): parse → clean → persist FileSheet/FileRow → chunk text → embed → Qdrant
  Documents (PDF/TXT/MD): extract text → chunk → embed → Qdrant
     ↓
UploadedFile.processingStatus = indexed | failed
```

---

## Stack

| Technology | Purpose |
|------------|---------|
| Node.js + TypeScript | Runtime |
| Fastify | HTTP API |
| Prisma + PostgreSQL | Relational data (datasets, files, rows, reports) |
| Redis + BullMQ | Job queues |
| Qdrant | Vector store for document chunks |
| `@xenova/transformers` | Local embedding model |
| Bull Board | Queue monitoring UI |
| Docker Compose | Local Postgres, Redis, Qdrant |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for infra)
- Node.js 22+
- npm

---

## Setup

### Option A — Docker full stack

```bash
cd datapilot-backend
cp .env.example .env
docker compose up --build
```

> Docker images may lag behind local `npm run dev` code. For latest features, use Option B.

### Option B — Local API + worker (recommended for development)

```bash
# 1. Infrastructure only
docker compose up postgres redis qdrant -d

# 2. Environment
cp .env.example .env

# 3. Install & migrate
npm install
npm run prisma:migrate
npm run prisma:seed

# 4. Terminal 1 — API
npm run dev

# 5. Terminal 2 — worker (required for uploads)
npm run dev:worker
```

Verify:

```bash
curl http://localhost:3001/api/health
open http://localhost:3001/admin/queues
```

### Port mapping (host)

| Service | Host port |
|---------|-----------|
| API | 3001 |
| PostgreSQL | 5432 |
| Redis | **6380** (not 6379) |
| Qdrant REST | **6335** (not 6333) |
| Qdrant gRPC | 6336 |

Set in `.env`: `REDIS_PORT=6380`, `QDRANT_URL=http://localhost:6335`.

---

## Service URLs

| Service | URL |
|---------|-----|
| API | http://localhost:3001/api |
| Bull Board | http://localhost:3001/admin/queues |
| Prisma Studio | http://localhost:5555 (`npm run prisma:studio`) |
| Qdrant UI | http://localhost:6335/dashboard |
| PostgreSQL | `postgresql://datapilot:datapilot@localhost:5432/datapilot` |

---

## API endpoints

Base: `http://localhost:3001/api`

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness |
| `GET` | `/health/ready` | Postgres + Redis checks |

### Datasets

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/datasets` | List datasets for dev user |
| `POST` | `/datasets` | Create dataset `{ name, description? }` |
| `GET` | `/datasets/:id` | Dataset with uploaded files |
| `GET` | `/datasets/:id/files/:fileId/headers` | Column headers |
| `GET` | `/datasets/:id/files/:fileId/rows?offset&limit` | Paginated cleaned rows (max 500) |
| `GET` | `/datasets/:id/files/:fileId/cleaning-report` | Latest cleaning report |
| `POST` | `/datasets/:id/files/:fileId/clean` | Re-clean from original file |

**Re-clean body** (`CleaningOptions`):

```json
{
  "trimCells": true,
  "normalizeHeaders": true,
  "removeEmptyRows": true,
  "removeDuplicateRows": true,
  "duplicateKeyColumns": ["email"]
}
```

### Uploads

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/uploads?datasetId=` | List uploads (optional filter) |
| `GET` | `/uploads/:id` | Single upload record |
| `POST` | `/uploads` | Multipart: fields `datasetId`, file part |

Supported file types: **PDF, CSV, XLS, XLSX, TXT, MD**.

### Users / AI / Reports (placeholders)

| Method | Path |
|--------|------|
| `GET` | `/users`, `/users/:id` |
| `GET` | `/ai/conversations` |
| `POST` | `/ai/conversations`, `/ai/query` |
| `GET` | `/reports`, `/reports/:id` |

---

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection | `localhost:5432` |
| `REDIS_HOST` / `REDIS_PORT` | BullMQ | `localhost` / `6380` |
| `QDRANT_URL` | Vector DB | `http://localhost:6335` |
| `QDRANT_COLLECTION` | Collection name | `datapilot_documents` |
| `CORS_ORIGIN` | Frontend origin | `http://localhost:3000` |
| `UPLOAD_DIR` | Local file storage | `./uploads` |
| `MAX_UPLOAD_BYTES` | Upload limit | `20971520` (20 MB) |
| `LOCAL_EMBEDDING_MODEL` | Transformers model | `Xenova/all-MiniLM-L6-v2` |
| `DEV_USER_ID` | Dev user for unauthenticated API | seed UUID |
| `BULL_BOARD_ENABLED` | Queue dashboard | `true` |
| `BULL_BOARD_PATH` | Dashboard path | `/admin/queues` |

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API with hot reload |
| `npm run dev:worker` | Worker with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` / `npm run worker` | Production API / worker |
| `npm run prisma:migrate` | Apply migrations |
| `npm run prisma:seed` | Dev user + Default Dataset |
| `npm run prisma:studio` | DB browser |

---

## Job processing & Bull Board

- Queue: **`data-processing`**
- Worker: `src/worker.ts`
- Processor: `src/workers/processors/data-processing.processor.ts`
- Dashboard: **http://localhost:3001/admin/queues** (disable with `BULL_BOARD_ENABLED=false`)

---

## Database models (Prisma)

| Model | Purpose |
|-------|---------|
| `User` | Platform users |
| `Dataset` | File collections |
| `UploadedFile` | Upload metadata + `processingStatus`, row/chunk counts |
| `FileSheet` | Tabular headers + cleaning config |
| `FileRow` | Cleaned row JSON |
| `CleaningReport` | Per-clean stats and config snapshot |
| `AIConversation` / `AIQuery` | Schema only (AI not wired) |

Seed creates:

- User: `dev@datapilot.local` (`DEV_USER_ID`)
- Dataset: **Default Dataset** (`00000000-0000-4000-8000-000000000002`)

---

## Project structure

```
src/
├── server.ts / worker.ts
├── app.ts
├── config/env.ts
├── plugins/          # prisma, redis, bullmq, bull-board
├── modules/
│   ├── datasets/     # CRUD + rows + cleaning
│   ├── uploads/      # multipart upload
│   ├── users/        # placeholder
│   ├── ai/           # placeholder
│   └── reports/      # placeholder
├── services/
│   ├── parsing/      # PDF/text + tabular (papaparse, xlsx)
│   ├── cleaning/     # sheet-cleaner
│   ├── tabular/      # persist cleaned rows
│   ├── chunking/
│   ├── embeddings/   # local Xenova provider
│   └── qdrant.service.ts
└── workers/processors/
prisma/schema.prisma
docker-compose.yml
```

---

## Troubleshooting

### `uv_interface_addresses` crash on `npm run dev`

Fastify crashes after startup when `HOST=0.0.0.0` because it calls `os.networkInterfaces()`. Common on Node 25 in Cursor/sandboxed terminals.

**Fix:** use `HOST=127.0.0.1` in `.env` (default in `.env.example`). Docker Compose still sets `HOST=0.0.0.0` inside containers. Local dev also auto-maps `0.0.0.0` → `127.0.0.1` in `server.ts`.

### Upload stuck on pending

Run `npm run dev:worker`. Inspect jobs at `/admin/queues`.

### Prisma Studio can't connect

Use `localhost` in `DATABASE_URL`, not Docker hostname `postgres`.

### Qdrant version warning

Client may log a version mismatch with the Docker Qdrant image — usually non-fatal. Align image tag or set `checkCompatibility: false` if needed.

### Migration / column errors

If tabular migration partially applied, run `npm run prisma:migrate` or inspect `prisma/migrations/`. Re-seed after migrate: `npm run prisma:seed`.

### Port 3001 in use

Stop Docker `datapilot-backend` container when running local `npm run dev`.

---

## Pending (backend)

- **Authentication** and multi-tenant dataset access
- **AI / RAG** — query endpoint using Qdrant retrieval + LLM
- **Reports** module — exports, scheduled reports
- **Users** module — real CRUD
- **OpenAI embeddings** — env vars exist in some setups; code currently uses local provider only
- **Multi-sheet Excel** — select sheet on upload/view
- **S3 / cloud storage** — replace local `UPLOAD_DIR` for production
- **Reconcile Docker images** with latest source
- **Qdrant collection migration** when changing embedding dimensions

---

## Related repo

Frontend: [`datapilot-frontend`](../datapilot-frontend)
