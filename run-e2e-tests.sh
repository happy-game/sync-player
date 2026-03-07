#!/bin/bash

# E2E Test Runner Script for Sync Player
# This script starts the backend and frontend servers, then runs the E2E tests

set -e

echo "🚀 Starting E2E Test Environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit
}

trap cleanup EXIT INT TERM

# Check if backend .env exists, if not create from example
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚙️  Creating server/.env from example...${NC}"
    cp server/.env.example server/.env
fi

# Check if frontend .env exists, if not create from example
if [ ! -f "player/.env" ]; then
    echo -e "${YELLOW}⚙️  Creating player/.env from example...${NC}"
    cp player/.env.example player/.env
fi

# Start backend server
echo -e "${GREEN}🔧 Starting backend server...${NC}"
mkdir -p log
cd server
go run cmd/server/main.go > ../log/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "Backend server started with PID: $BACKEND_PID"
echo "Waiting for backend to be ready..."
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend server failed to start. Check log/backend.log for details.${NC}"
    cat log/backend.log
    exit 1
fi

# Wait for backend to be ready
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1 || curl -s http://localhost:3000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend server is ready!${NC}"
        break
    fi
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ Backend server did not become ready in time${NC}"
        echo "Backend log:"
        cat log/backend.log
        exit 1
    fi
    # Only echo every 5 seconds to reduce noise
    if [ $((attempt % 5)) -eq 0 ]; then
        echo "Waiting for backend... ($attempt/$max_attempts)"
    fi
    sleep 1
done

# Start frontend server
echo -e "${GREEN}🎨 Starting frontend server...${NC}"
cd player
npm run dev > ../log/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "Frontend server started with PID: $FRONTEND_PID"
echo "Waiting for frontend to be ready..."
sleep 5

# Wait for frontend to be ready
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend server is ready!${NC}"
        break
    fi
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ Frontend server did not become ready in time${NC}"
        echo "Frontend log:"
        cat log/frontend.log
        exit 1
    fi
    # Only echo every 5 seconds to reduce noise
    if [ $((attempt % 5)) -eq 0 ]; then
        echo "Waiting for frontend... ($attempt/$max_attempts)"
    fi
    sleep 1
done

echo -e "\n${GREEN}🎬 Generating test videos...${NC}"
GENERATE_SCRIPT="player/e2e/generate-test-videos.sh"
if [ -f "$GENERATE_SCRIPT" ]; then
    bash "$GENERATE_SCRIPT"
else
    echo -e "${YELLOW}⚠️  Test video generation script not found: $GENERATE_SCRIPT${NC}"
    echo "Tests that require video playback may fail."
fi

echo -e "\n${GREEN}🎯 Running E2E tests...${NC}\n"

# Run the tests
cd player
npm run test:e2e || TEST_RESULT=$?
cd ..

# Show results
if [ -z "$TEST_RESULT" ] || [ $TEST_RESULT -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed!${NC}"
else
    echo -e "\n${RED}❌ Some tests failed. Exit code: $TEST_RESULT${NC}"
fi

# Logs are available
echo -e "\n${YELLOW}📋 Logs available at:${NC}"
echo "  - Backend: $(pwd)/log/backend.log"
echo "  - Frontend: $(pwd)/log/frontend.log"


exit ${TEST_RESULT:-0}
