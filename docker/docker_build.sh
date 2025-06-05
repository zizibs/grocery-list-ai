#!/bin/bash
set -e

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root directory (parent of script directory)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "Building Docker image for grocery-list-ai..."
echo "Building from: $PROJECT_ROOT"

# Change to project root and build
cd "$PROJECT_ROOT"
docker build -f docker/Dockerfile -t grocery-list-ai:latest .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Docker image built and tagged as grocery-list-ai:latest"
else
    echo "❌ Docker build failed"
    exit 1
fi 