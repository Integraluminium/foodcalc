#!/usr/bin/env bash
# Refreshes the sqlx offline query cache (.sqlx) for the workspace.
set -euo pipefail
cd "$(dirname "$0")/../foodlib_new"
exec cargo sqlx prepare --workspace
