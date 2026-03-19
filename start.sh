#!bin/bash

cd /app/backend
uvicorn Server:App --host 127.0.0.1 --port 8000 &

cd /app/frontend
npm run dev &

echo "Starting up..."
nginx -g "daemon off;"