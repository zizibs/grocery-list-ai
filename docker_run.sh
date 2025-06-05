#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Docker containers..."

# Check if containers are already running
if [ "$(docker-compose ps -q)" ]; then
    echo "🛑 Containers are already running. Stopping them first..."
    docker-compose down
fi

# Start the containers
echo "🏃 Starting containers..."
docker-compose up -d

# Wait for the application to be ready
echo "⏳ Waiting for the application to be ready..."
sleep 10

# Check if the application is running
echo "🔍 Checking if the application is running..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Application is running at http://localhost:3000"
else
    echo "❌ Application failed to start. Check the logs with 'docker-compose logs'"
    exit 1
fi 