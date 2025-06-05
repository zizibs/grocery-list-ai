#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting Docker build process..."

# Stop any running containers
echo "🛑 Stopping any running containers..."
docker-compose down

# Remove old images and unused containers
echo "🧹 Cleaning up old images and containers..."
docker system prune -f

# Build the images
echo "🏗️  Building new images..."
docker-compose build --no-cache

echo "✅ Build complete! You can now run './docker_run.sh' to start the application." 