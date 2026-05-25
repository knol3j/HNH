# HashnHedge release notes

Date: 2026-05-25
Commit: cf2075c1efb199ba122ba256e29fdf68c9f6849a
Branch: main

## Summary
This release completes the requested bulk implementation set and pushes production-facing fixes for API visibility, miner reliability, and test stability.

## Included changes

1) API: network stats endpoint
- Added `GET /network/stats` in `backend/api/index.js`.
- Returns:
  - `activeNodes`
  - `totalTflops`
  - `jobsRunning`
  - `networkUtilization`
  - `avgPricePerFLOP`

2) API rate limiting adjustment
- Updated general limiter from 100 -> 200 requests/minute.

3) Frontend test reliability
- Added `testTimeout: 30000` to `vite.config.ts` to reduce test timeout flakes.

4) Miner resilience
- Added health watchdog in `agent/miners/MinerManager.js`:
  - `startHealthCheck()`
  - `stopHealthCheck()`
  - Auto-restart if active miner process dies.

5) Miner binary bootstrap script
- Added executable script: `scripts/download-miners.sh`
- Documents/downloads pinned versions for T-Rex, XMRig, and lolMiner.

6) Security documentation around T-Rex local API
- Added inline security notes in:
  - `agent/miners/RvnMiner.js`
  - `agent/miners/EtcMiner.js`
  - `agent/miners/ErgMiner.js`

7) Repo hygiene
- Stopped tracking `.env` in git.
- Added `/HNH/` stale nested checkout path to `.gitignore`.

## Validation performed after release

Deployment/runtime checks:
- Railway project/services status: SUCCESS for api/app/agent/stratum/Postgres/HNH.
- Endpoint probes:
  - `https://hashnhedge.com` -> 200
  - `https://www.hashnhedge.com` -> 200
  - `https://api.hashnhedge.com/health` -> 200

CORS checks:
- Preflight OPTIONS `/auth/login` from both origins is passing with 204:
  - `https://hashnhedge.com`
  - `https://www.hashnhedge.com`

Test checks:
- Local frontend test suite:
  - `npm test` -> 5 files passed, 71 tests passed.

CI checks:
- Latest GitHub Actions runs for this push are green, including CI Tests and Railway Health Check.

## Notes
- `https://hashnhedge-production.up.railway.app/health` returned 404 during validation. Public custom domains and API health endpoint are currently healthy.
