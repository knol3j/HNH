# Copilot Instructions for HashNHedge

## Project Architecture
- **Frontend**: HTML pages (`index.html`, `dashboard.html`, `gpu-farm-dashboard.html`, etc.) with supporting assets in `css/`, `img/`, and `js/`.
- **Backend/Automation**: Scripts in `actions-runner/` and `mining-engine/` for automation, certificate handling, and node setup.
- **Smart Contracts**: Located in `contracts/` (not detailed here, but referenced in project overview).
- **Pages**: All user-facing features are in `pages/` (e.g., dashboards, whitepaper).

## Key Workflows
- **Local Development**: Open `index.html` in a browser for UI testing. No build step required for basic HTML/CSS/JS changes.
- **Deployment**: Build (if needed), then upload all files to web hosting. Point domain to `index.html`.
- **Certificate Download**: Use `actions-runner/bin/checkScripts/downloadCert.js` to fetch and store CA certificates for secure runner setup. Handles proxy and direct connections.
- **Node Setup**: Use scripts in `mining-engine/` and `actions-runner/` for installing dependencies and configuring GPU nodes.

## Patterns & Conventions
- **Environment Variables**: Scripts (e.g., `downloadCert.js`) rely on env vars for configuration (`HOSTNAME`, `PORT`, `PAT`, `PROXYHOST`, etc.).
- **Proxy Support**: Certificate and runner scripts support proxy authentication via env vars.
- **PEM Encoding**: Certificates are encoded in PEM format, split into 64-char lines, and written to disk.
- **Revenue Model**: Dual streams (mining + AI/ML compute) with smart contract orchestration (Solana).
- **Security**: Dynamic switching between mining and pentesting modes is supported in platform logic.

## Integration Points
- **Solana Blockchain**: Sm art contracts for resource allocation and revenue sharing (see `contracts/`).
- **External GPU Farms**: Integrated via standardized APIs (details in dashboard and engine scripts).
- **Security Tools**: Platform supports switching between compute and security tasks.

## Examples
- To fetch CA certs: Run `downloadCert.js` with required env vars set. Output is `download_ca_cert.pem`.
- To add a new dashboard: Create an HTML file in `pages/`, link it from `index.html` and update navigation.

## References
- `README.md`: Project overview, structure, and deployment steps
- `actions-runner/bin/checkScripts/downloadCert.js`: Certificate handling logic
- `mining-engine/`: Node setup and automation scripts
- `pages/`: All user-facing features

---
_If any section is unclear or missing, please provide feedback for further refinement._
