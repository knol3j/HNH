#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

npm install
npm run prisma:generate
npm run build
npm test
