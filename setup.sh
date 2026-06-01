#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_ENV_FILE="$BACKEND_DIR/.env"
DEFAULT_DATABASE_URL="file:./dev.db"
DEFAULT_JWT_SECRET="change-me-in-production"

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
  npm --prefix "$BACKEND_DIR" exec prisma generate
  npm --prefix "$BACKEND_DIR" exec prisma migrate deploy
  npm --prefix "$BACKEND_DIR" run seed
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

  print_step "Checking Node.js version"
  node --version
  npm --version

  install_dependencies "$BACKEND_DIR" "backend"
  install_dependencies "$FRONTEND_DIR" "frontend"
  setup_backend
  print_summary
}

main "$@"
