# crm-backend

Marketing agency CRM API: Express, TypeScript, MongoDB (Mongoose), JWT auth (Admin and Standard; no public signup), REST at `/api/v1`.

## Requirements

- Node 20+
- MongoDB 6+ (local or Atlas)

## Environment

Copy `.env.example` to `.env` and set at least:

- `MONGODB_URI` — e.g. `mongodb://127.0.0.1:27017/crm`
- `JWT_SECRET` — long random string (minimum 32 characters in production)
- `PORT` — default `4000`

## First admin user

With Mongo running and `MONGODB_URI` / `JWT_SECRET` set in the environment (or `.env` for local scripts via `dotenv`):

```bash
CREATE_ADMIN_EMAIL=admin@example.com CREATE_ADMIN_PASSWORD='your-secure-password' npm run create-admin
```

Then log in: `POST /api/v1/auth/login` with JSON `{ "email", "password" }` and use `Authorization: Bearer <accessToken>` for protected routes.

## Scripts

- `npm run dev` — `tsx watch` on `src/server.ts`
- `npm run build` — compile to `dist/`
- `npm start` — run `dist/server.js`
- `npm run create-admin` — one-off admin bootstrap (see above)
- `npm test` — Vitest unit smoke (`GET /health` on the app, no database)
- `npm run test:api` — full REST integration suite (in-memory MongoDB via `mongodb-memory-server`; no install of `mongod` required)
- `npm run smoke:server` — after `build`, starts `dist/server.js` with in-memory Mongo and checks `GET /health` and `GET /ready`

## API overview (prefix `/api/v1`)

| Area | Notes |
|------|--------|
| `POST /auth/login`, `GET /auth/me` | JWT |
| `GET/POST/PATCH /users` … | User listing (all), create/reset (admin) |
| `CRUD /accounts` | Delete account: admin; blocked if child data exists |
| `CRUD /contacts` (list by `accountId`) | |
| `CRUD /deals` | Commercial changes audited |
| `CRUD /engagements` | Delete: admin; audited |
| `CRUD /projects` | Cascade deletes tasks + deliverables |
| `CRUD /tasks` | Subtasks, dependencies, cycle check |
| `CRUD /deliverables` | |
| `CRUD /activities` | At least one of `accountId`, `dealId`, `projectId` on create |
| `GET, POST/PATCH/DELETE /service-catalog` | Read all; write admin |
| `GET /dashboard/summary` | Pipeline, open tasks, at-risk accounts, upcoming engagements |
| `GET /export/accounts.csv`, `GET /export/deals.csv` | CSV |
| `GET /audit-logs` | Admin only |

Public liveness: `GET /health`, readiness: `GET /ready` (Mongo ping).

## Docker (optional) — Mongo

```bash
docker run -d -p 27017:27017 --name crm-mongo mongo:7
```
