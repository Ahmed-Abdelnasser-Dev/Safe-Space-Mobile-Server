# SafeSpace Mobile Server

Express (TypeScript) + PostgreSQL (Prisma) backend for:
- Accidents & Emergency reporting
- Central Unit integration over HTTP + inbound webhook protected by **mTLS**
- (Implemented last) JWT auth (access/refresh) + push notifications

## Requirements
- Node.js (current project is ESM, `"type": "module"`)
- Postgres (or Docker)

## Quick start (local)

1) Install deps:

```bash
npm install
```

2) Create local env file:

```bash
cp .env.example .env
```

3) Startup preflight (required keys in `.env`):
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

4) Run with one command:

```bash
npm start
```

No `.env` file option (single command):

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/safeespace_mobile_server_db?schema=public' JWT_ACCESS_SECRET='dev-access-secret' JWT_REFRESH_SECRET='dev-refresh-secret' npm start
```

Server health check: `GET /health`

## Docker

```bash
docker compose up --build
```

This starts:
- `db`: Postgres 16 on `localhost:5432` (or `${POSTGRES_PORT}`)
- `api`: SafeSpace API on `localhost:3103` (or `${API_PORT}`), container port `3000`

Health check:

```bash
curl -fsS http://127.0.0.1:3103/health
```

Notes:
- Docker compose requires `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (read from local `.env` by default).
- Docker compose defaults to `NODE_ENV=production` to avoid verbose response-body logging.
- The API image runs Prisma deploy on startup, then serves compiled output (`node dist/server.js`).

If host ports are already in use, override them per run:

```bash
API_PORT=3200 POSTGRES_PORT=55432 docker compose up --build
```

## Endpoints (must match exactly)

- Auth:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh-token`
  - `POST /auth/logout`
- Accidents:
  - `POST /accident/report-accident`
- Emergency:
  - `POST /emergency/request` - Create emergency request
  - `GET /emergency/request/:id` - Get emergency request by ID
  - `GET /emergency/requests` - List emergency requests
  - `PATCH /emergency/request/:id/status` - Update status (auth required)
- Central Unit:
  - `POST /central-unit/send-accident-to-central-unit`
  - `POST /central-unit/receive-accident-from-central-unit`
- Notifications:
  - `POST /notifications/send-accident-notification`
- Profile:
  - `GET /profile` - Get user profile (auth required)
  - `PATCH /profile` - Update user profile (auth required)

## Central Unit inbound mTLS

This project supports two deployment modes for the inbound webhook:
- **Direct Node TLS (dev/local)**: configure `TLS_CERT_PATH`, `TLS_KEY_PATH`, and `CENTRAL_UNIT_MTLS_CA_CERT_PATH`, set `CENTRAL_UNIT_INBOUND_AUTH_MODE=mtls`.
- **Proxy terminated mTLS (prod typical)**: configure your reverse proxy/ingress to enforce mTLS and forward a verified header, set `CENTRAL_UNIT_INBOUND_AUTH_MODE=proxy`.

## Prisma note (offline environments)

Prisma CLI sometimes needs to download engine binaries from `binaries.prisma.sh`. If that is blocked, you may see timeouts during `prisma generate` / migrations.

Helpful env vars (Prisma docs):
- `PRISMA_ENGINES_MIRROR` (use your own mirror)
- `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` (ignore checksum download issues)

An initial SQL migration is committed at `prisma/migrations/0001_init/migration.sql`.

## Postman

Collection file: `postman/safespace-mobile-server.postman_collection.json`  
Variables: `baseUrl`, `accessToken`, `refreshToken`

## Tests

```bash
npm test
```

