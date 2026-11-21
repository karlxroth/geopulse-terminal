#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
echo "==> Starte GeoPulse Local Workstation auf http://localhost:3000 ..."
(sleep 2 && open "http://localhost:3000") &
npm run start
