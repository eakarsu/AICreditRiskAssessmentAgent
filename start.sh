#!/bin/bash

# AI Credit Risk Assessment Agent - Start Script
# ================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║     AI Credit Risk Assessment Agent          ║"
echo "║     Starting Application...                  ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# Load env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Environment loaded${NC}"
else
  echo -e "${RED}✗ .env file not found!${NC}"
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill processes on used ports
echo -e "${YELLOW}→ Cleaning up ports ${BACKEND_PORT} and ${FRONTEND_PORT}...${NC}"
lsof -ti:${BACKEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:${FRONTEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1
echo -e "${GREEN}✓ Ports cleaned${NC}"

# Check PostgreSQL
echo -e "${YELLOW}→ Checking PostgreSQL...${NC}"
if command -v pg_isready &> /dev/null; then
  pg_isready -q && echo -e "${GREEN}✓ PostgreSQL is running${NC}" || {
    echo -e "${YELLOW}→ Starting PostgreSQL...${NC}"
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
  }
else
  echo -e "${YELLOW}⚠ pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# Create database if not exists
echo -e "${YELLOW}→ Setting up database...${NC}"
psql -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='creditrisk'" | grep -q 1 || \
  psql -U postgres -c "CREATE ROLE creditrisk WITH LOGIN PASSWORD 'creditrisk123';" 2>/dev/null || true

psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='creditrisk_db'" | grep -q 1 || \
  psql -U postgres -c "CREATE DATABASE creditrisk_db OWNER creditrisk;" 2>/dev/null || true

psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE creditrisk_db TO creditrisk;" 2>/dev/null || true
echo -e "${GREEN}✓ Database ready${NC}"

# Install backend dependencies
echo -e "${YELLOW}→ Installing backend dependencies...${NC}"
cd backend
npm install --silent 2>/dev/null
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Seed data
echo -e "${YELLOW}→ Seeding database...${NC}"
node src/seeds/seed.js
echo -e "${GREEN}✓ Database seeded${NC}"

# Start backend with hot reload (nodemon)
echo -e "${YELLOW}→ Starting backend on port ${BACKEND_PORT}...${NC}"
npx nodemon src/index.js &
BACKEND_PID=$!
cd ..

# Install frontend dependencies
echo -e "${YELLOW}→ Installing frontend dependencies...${NC}"
cd frontend
npm install --silent 2>/dev/null
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Start frontend with hot reload (Vite)
echo -e "${YELLOW}→ Starting frontend on port ${FRONTEND_PORT}...${NC}"
npx vite --port ${FRONTEND_PORT} &
FRONTEND_PID=$!
cd ..

sleep 3

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Application Started Successfully!        ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║  Frontend:  ${CYAN}http://localhost:${FRONTEND_PORT}${GREEN}             ║${NC}"
echo -e "${GREEN}║  Backend:   ${CYAN}http://localhost:${BACKEND_PORT}${GREEN}             ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║  Login:     ${CYAN}admin@creditrisk.ai / admin123${GREEN}  ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}║  Hot reload enabled for both services        ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop all services           ║${NC}"
echo -e "${GREEN}║                                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Trap to clean up on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}→ Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  lsof -ti:${BACKEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:${FRONTEND_PORT} 2>/dev/null | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}✓ All services stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for background processes
wait
