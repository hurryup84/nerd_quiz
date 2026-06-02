# Nerd Quiz

Nerd Quiz is a local full-stack quiz app with a NestJS backend, a React/Vite frontend, and a SQLite database managed through Prisma.

## Stack

- Backend: NestJS, Prisma, SQLite
- Frontend: React, Vite, React Router, React Query
- Auth: cookie-based JWT auth

## Requirements

- Node.js 22
- npm

If you use `nvm`, both `setup.sh` and `start.sh` try to switch to Node 22 automatically before running project commands.

## First-time setup

From the repository root run:

```bash
./setup.sh
```

What `setup.sh` does:

- installs backend dependencies
- installs frontend dependencies
- creates `backend/.env` if it does not exist
- generates the Prisma client
- applies Prisma migrations to the local SQLite database
- seeds the local database with a default admin user and sample questions

The generated local defaults are:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-in-production"
```

If you need different values, edit `backend/.env` and rerun the relevant backend commands.

## Start and stop the app

Start both services in the background:

```bash
./start.sh start
```

Stop both services:

```bash
./start.sh stop
```

Restart both services:

```bash
./start.sh restart
```

Development URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

Logs are written to:

- `backend.log`
- `frontend.log`

## Rough usage

1. Run `./setup.sh` once on a new machine.
2. Run `./start.sh start`.
3. Open http://localhost:5173.
4. Log in with the seeded admin account:

```text
username: admin
password: admin1234
```

5. Use the app:

- register a normal user account from the login screen if needed
- start a quiz round from the dashboard
- answer active quiz questions in the quiz screen
- review previous rounds in history and insights
- use the admin area to add, edit, import, or export questions
- change your password from the settings page

## Useful commands

Backend:

```bash
npm --prefix backend run start:dev
npm --prefix backend run seed
npm --prefix backend test
```

Frontend:

```bash
npm --prefix frontend run dev
npm --prefix frontend run build
```

## Notes

- The frontend proxies `/api` requests to `http://localhost:3000` in development.
- The local SQLite database lives at `backend/dev.db`.
- `setup.sh` is safe to rerun on the same machine. It reuses the existing `backend/.env` and skips reseeding the admin if it already exists.

## Deploy On Render (Free-Tier Friendly)

You can deploy this project with two Render services:

1. Backend as a Web Service (Node)
2. Frontend as a Static Site

### 1) Prepare a production database URL

Local SQLite (`file:./dev.db`) is fine for development, but not for free cloud runtimes with ephemeral disks.

Use a hosted SQLite-compatible URL instead (for example Turso/libSQL):

- `DATABASE_URL=libsql://...`
- `TURSO_AUTH_TOKEN=...` (if required by your provider)

### 2) Create the backend service on Render

- Service type: Web Service
- Root directory: `backend`
- Build command:

```bash
npm install --include=dev && npm run build && npm run bootstrap:db
```

- Start command:

```bash
npm run start:render
```

- Required environment variables:

```env
NODE_ENV=production
JWT_SECRET=<long-random-secret>
DATABASE_URL=file:./dev.db
TURSO_DATABASE_URL=<your-libsql-url>
TURSO_AUTH_TOKEN=<token-if-required>
FRONTEND_URL=https://<your-frontend>.onrender.com
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

Notes:

- Render injects `PORT` automatically; backend now listens on it.
- Nest build output is emitted under `dist/src`, so production startup uses that compiled entrypoint.
- `npm run bootstrap:db` checks if required tables already exist in Turso. It only runs `prisma db push` when tables are missing, and then runs seed.
- For `libsql://` targets (Turso), `npm run bootstrap:db` applies checked-in SQL migration files directly instead of `prisma db push`, then seeds.
- `npm run start:render` runs the same safe bootstrap at runtime before starting the backend, which avoids `no such table` errors if the runtime instance starts with a fresh local filesystem.

### 3) Create the frontend static site on Render

- Service type: Static Site
- Root directory: `frontend`
- Build command:

```bash
npm ci && npm run build
```

- Publish directory:

```bash
dist
```

- Environment variable:

```env
VITE_API_BASE_URL=https://<your-backend>.onrender.com/api
```

### 4) Post-deploy checks

1. Open the frontend URL and register/login.
2. Verify login persists (cookie auth).
3. Test quiz start/answer/history flows.
4. Confirm backend logs show successful Prisma connection.

### 5) Free-tier caveats

- Free instances can sleep. First request after inactivity can be slow.
- Avoid writing app state to local disk in cloud runtime.
- If you need guaranteed persistence and low cold-start, move to a paid plan.
