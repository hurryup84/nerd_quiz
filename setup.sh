#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_ENV_FILE="$BACKEND_DIR/.env"
DEFAULT_DATABASE_URL="file:./dev.db"
DEFAULT_JWT_SECRET="change-me-in-production"
REQUIRED_NODE_MAJOR=22
MINIMUM_NPM_MAJOR=10

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name"
    exit 1
  fi
}

print_step() {
  echo
  echo "==> $1"
}

try_use_nvm() {
  export NVM_DIR="$HOME/.nvm"

  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
    nvm use "$REQUIRED_NODE_MAJOR" >/dev/null 2>&1 || true
  fi
}

verify_runtime_versions() {
  local node_major
  local npm_major

  node_major="$(node -p "process.versions.node.split('.')[0]")"
  npm_major="$(npm --version | cut -d. -f1)"

  if [ "$node_major" -lt "$REQUIRED_NODE_MAJOR" ]; then
    echo "Node.js $REQUIRED_NODE_MAJOR or newer is required. Current version: $(node --version)"
    echo "Install Node.js $REQUIRED_NODE_MAJOR and rerun ./setup.sh."
    exit 1
  fi

  if [ "$npm_major" -lt "$MINIMUM_NPM_MAJOR" ]; then
    echo "npm $MINIMUM_NPM_MAJOR or newer is required. Current version: $(npm --version)"
    echo "Switch to a newer Node.js installation, for example with: nvm use $REQUIRED_NODE_MAJOR"
    exit 1
  fi
}

ensure_backend_env() {
  if [ -f "$BACKEND_ENV_FILE" ]; then
    echo "Using existing backend/.env"
    return
  fi

  cat > "$BACKEND_ENV_FILE" <<EOF
DATABASE_URL="$DEFAULT_DATABASE_URL"
JWT_SECRET="$DEFAULT_JWT_SECRET"
EOF

  echo "Created backend/.env with local development defaults"
}

install_dependencies() {
  local project_dir="$1"
  local project_name="$2"

  print_step "Installing $project_name dependencies"
  npm --prefix "$project_dir" install
}

setup_backend() {
  print_step "Preparing backend"
  ensure_backend_env
  (
    cd "$BACKEND_DIR"
    npm exec prisma generate
    # Local setup should match the current Prisma schema even when no migration file exists.
    npm exec prisma db push
    npm run seed
  )
}

print_summary() {
  cat <<EOF

Setup complete.

Next steps:
  1. Start the app with: ./start.sh start
  2. Open the frontend at: http://localhost:5173
  3. Log in as admin with: admin / admin1234

The backend API runs at http://localhost:3000/api during development.
EOF
}

main() {
  require_command node
  require_command npm
  try_use_nvm

  print_step "Checking Node.js version"
  node --version
  npm --version
  verify_runtime_versions

  install_dependencies "$BACKEND_DIR" "backend"
  install_dependencies "$FRONTEND_DIR" "frontend"
  setup_backend
  print_summary
}

main "$@"
