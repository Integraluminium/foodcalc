#!/usr/bin/env bash
# Applies pending sqlx migrations of foodlib_new against the configured DB.
set -euo pipefail
cd "$(dirname "$0")/../foodlib_new"
exec sqlx migrate run
