#!/bin/bash
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root directory (parent of script directory)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "Building Docker image for grocery-list-ai..."
echo "Building from: $PROJECT_ROOT"

# Change to project root and build
cd "$PROJECT_ROOT"
docker build -f docker/Dockerfile -t grocery-list-ai .
echo "Docker image built and tagged as grocery-list-ai." 