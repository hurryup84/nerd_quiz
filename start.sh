#!/bin/bash

# Configuration
ROOT_DIR=$(pwd)
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PID_FILE="$ROOT_DIR/.backend.pid"
FRONTEND_PID_FILE="$ROOT_DIR/.frontend.pid"

# Function to start services
start() {
    echo "--- Starting Nerd Quiz Services ---"
    
    # Try to load NVM if it exists
    export NVM_DIR="$HOME/.nvm"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        . "$NVM_DIR/nvm.sh"
        nvm use 22 > /dev/null 2>&1
    fi

    # Start Backend
    echo "Starting Backend (NestJS)..."
    cd "$BACKEND_DIR"
    npm run start:dev > "$ROOT_DIR/backend.log" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
    
    # Start Frontend
    echo "Starting Frontend (Vite)..."
    cd "$FRONTEND_DIR"
    npm run dev > "$ROOT_DIR/frontend.log" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"

    # Display network info
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")

    echo "------------------------------------"
    echo "Services are running in the background."
    echo "Local:   http://localhost:5173"
    echo "Network: http://$LOCAL_IP:5173"
    echo "Backend API: http://localhost:3000"
    echo "Logs: tail -f backend.log frontend.log"
    echo "------------------------------------"
}

# Function to stop services
stop() {
    echo "--- Stopping Nerd Quiz Services ---"

    # Kill by port — most reliable way to stop the actual listening processes
    echo "Killing process on port 3000 (backend)..."
    lsof -ti:3000 | xargs kill 2>/dev/null
    sleep 1

    echo "Killing process on port 5173 (frontend)..."
    lsof -ti:5173 | xargs kill 2>/dev/null
    sleep 1

    # Also kill by PID files if they exist
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        echo "Stopping Backend (PID $PID)..."
        pkill -P "$PID" 2>/dev/null
        kill "$PID" 2>/dev/null
        rm "$BACKEND_PID_FILE"
    fi

    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        echo "Stopping Frontend (PID $PID)..."
        pkill -P "$PID" 2>/dev/null
        kill "$PID" 2>/dev/null
        rm "$FRONTEND_PID_FILE"
    fi

    # Fallback: kill any remaining related processes
    pkill -f "node.*nest" 2>/dev/null
    pkill -f "vite" 2>/dev/null

    echo "Services stopped."
}

# Main logic
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        start
        ;;
    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
        ;;
esac
