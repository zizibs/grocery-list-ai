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

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "Error: .env file not found in $PROJECT_ROOT"
    echo "Please create a .env file with the required environment variables"
    exit 1
fi

echo "Checking for existing container..."
# Stop and remove existing container if it exists
if [ "$(docker ps -q -f name=grocery-list-container)" ]; then
    echo "Stopping existing container..."
    docker stop grocery-list-container
    docker rm grocery-list-container
elif [ "$(docker ps -aq -f status=exited -f name=grocery-list-container)" ]; then
    echo "Removing stopped container..."
    docker rm grocery-list-container
fi

echo "Running grocery-list-ai Docker container..."
# Run the container with environment variables from .env file
cd "$PROJECT_ROOT"
docker run --detach \
  --name grocery-list-container \
  --network="host" \
  --env-file .env \
  -p 3000:3000 \
  grocery-list-ai:latest

# Check if container started successfully
if [ $? -eq 0 ]; then
    echo "✅ Container started successfully!"
else
    echo "❌ Failed to start container"
    exit 1
fi

# Show container status
echo ""
echo "------------------------"
echo "Container status:"
docker ps --filter "name=grocery-list-container" --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "------------------------"
echo ""
echo "Access your app at: http://localhost:3000"
echo "To view logs: docker logs grocery-list-container"
echo "To view logs continuously: docker logs -f grocery-list-container"
echo "To stop: docker stop grocery-list-container"

# Enter the container shell
echo "Entering Docker shell..."
echo "Type 'exit' to return to your local shell"
docker exec -it grocery-list-container /bin/sh 