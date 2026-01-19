#!/bin/bash

# Start script for development
echo "Starting MindTrip GigConnect Backend..."

# Run migrations
echo "Running database migrations..."
alembic upgrade head

# Start the application
echo "Starting FastAPI application..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload