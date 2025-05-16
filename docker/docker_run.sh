#!/bin/bash
set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root directory (parent of script directory)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

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

echo "Running grocery-list-ai Docker container in background..."
# Explicitly setting the DATABASE_URL environment variable and running in detached mode
cd "$PROJECT_ROOT"
docker run --detach --network="host" \
  -e DATABASE_URL="postgresql://groceryuser:grocerypass@localhost:5432/grocery_list?schema=public" \
  -p 3000:3000 \
  --name grocery-list-container \
  grocery-list-ai

# Show container status
echo ""
echo "Container started successfully!"
echo "------------------------"
echo "Container status:"
docker ps --filter "name=grocery-list-container" --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "------------------------"
echo ""
echo "Access your app at: http://localhost:3000"
echo "To view logs: docker logs grocery-list-container"
echo "To view logs continuously: docker logs -f grocery-list-container"
echo "To stop: docker stop grocery-list-container"

# Enter the container shell with custom prompt
echo "Entering Docker container shell..."
echo "Type 'exit' to return to your local shell"
docker exec -it grocery-list-container /bin/sh -c 'export PS1="[DOCKER] ziv@container:/app \$ " && /bin/sh' 