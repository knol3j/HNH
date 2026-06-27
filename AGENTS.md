# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

HashNHedge is a cryptocurrency mining platform with four services:

| Service | Directory | Port | Run Command |
|---------|-----------|------|-------------|
| **Frontend** (React/Vite) | `/` (root) | 3000 | `npm run dev` |
| **Backend API** (Express/Prisma) | `backend/api/` | 8080 | `npm start` |
| **Mining Agent** (Express/Electron) | `agent/` | 4343 | `node server.js` |
| **Stratum Proxy** (TCP/pg) | `backend/stratum/` | 3333 | `node server.js` |

### Running Tests

All test suites use mocks and do **not** require a running database or external services.

| Suite | Command | Framework |
|-------|---------|-----------|
| Frontend | `npm test` (from root) | Vitest |
| Backend API | `cd backend/api && npm test` | Jest (with `--experimental-vm-modules`) |
| Agent | `cd agent && npm test` | Jest (with `--experimental-vm-modules`) |
| Stratum | `cd backend/stratum && npm test` | Jest (with `--experimental-vm-modules`) |
| All (except stratum) | `npm run test:all` (from root) | — |

### Known Test Failures (pre-existing)

- `tests/views/Auth.test.tsx` — all 17 tests fail because the `Auth` component requires `AuthProvider` but tests don't wrap it. This is a pre-existing issue in the repo.
- `tests/services/authService.test.ts` — 1 test fails (`should fetch and return user profile when token exists`) due to mock assertion mismatch with `apiClient.ts` adding extra headers.
- `tests/services/profitabilityService.test.ts` — 1 test fails (`should fetch and return coin prices from CoinGecko`) due to mock assertion mismatch with `apiClient.ts` adding extra args.

### Development Notes

- **Package manager**: npm (lockfiles: `package-lock.json` in root, `backend/api/`, `agent/`, `backend/stratum/`).
- **Node.js**: 20+ required (CI uses Node 20; Node 22 works fine locally).
- **Prisma**: After installing backend/api deps, run `npx prisma generate` in `backend/api/` to generate the client. This is needed before running the backend API server (not needed for tests since they mock Prisma).
- **Frontend .env**: The root `.env` points `VITE_API_URL` to the production Railway backend. For local backend development, override with `VITE_API_URL=http://localhost:8080`.
- **Backend API requires** `DATABASE_URL` and `JWT_SECRET` env vars to start the server. Tests mock all DB calls so these are not needed for testing.
- **No lint config**: There is no ESLint or other linter configuration in this repository. TypeScript type checking is done via `vite build`.
- **Build**: `npm run build` (root) or `npx vite build` builds the frontend to `dist/`.
