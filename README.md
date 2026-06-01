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
