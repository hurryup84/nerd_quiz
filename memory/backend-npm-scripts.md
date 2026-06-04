---
name: backend-npm-scripts
description: Backend/frontend use setup.sh and start.sh at project root instead of direct npm/npx
metadata:
  type: project
---

The project uses shell scripts at the root for all npm operations — don't run `npm` or `npx` directly.
- `./setup.sh` — installs deps for both backend and frontend, runs prisma generate, db push, and seed
- `./start.sh start` — starts both backend (port 3000) and frontend (port 5173) in background
- `./start.sh stop` — stops both services

Both scripts load nvm with Node 22. The backend uses NestJS, the frontend uses Vite+React.
How to apply: Run ./setup.sh and ./start.sh from the project root, never npm/npx directly.
