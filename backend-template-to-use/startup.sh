#!/bin/sh
set -e  # Exit on any error

echo "🚀 Starting MindTrip GigConnect Backend..." >&2

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..." >&2
until pg_isready -h "$DATABASE_HOST" -p "$DATABASE_PORT" -U "$DATABASE_USER"; do
  echo "Database is unavailable - sleeping" >&2
  sleep 2
done
echo "✅ Database is ready!" >&2

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..." >&2
until redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping | grep -q PONG; do
  echo "Redis is unavailable - sleeping" >&2
  sleep 2
done
echo "✅ Redis is ready!" >&2

# Run Alembic migrations
echo "🔄 Running database migrations..." >&2
alembic upgrade head || { echo "❌ Alembic migrations failed!" >&2; exit 1; }
echo "✅ Database migrations completed!" >&2

# Seed default data
echo "🌱 Seeding default data..." >&2
python seed_data.py || { echo "❌ Seeding database failed!" >&2; exit 1; }
echo "✅ Default data seeded successfully!" >&2

# Optionally seed development data (uncomment when needed)
echo "🌱 Seeding development data..." >&2
python dev_seed_data.py || { echo "❌ Seeding development data failed!" >&2; exit 1; }
echo "✅ Development data seeded successfully!" >&2

# Start the FastAPI application
echo "🚀 Starting FastAPI application..." >&2
if [ "$ENVIRONMENT" = "development" ] || [ "$ENVIRONMENT" = "dev" ]; then
  echo "🔧 Running in development mode with hot reload..." >&2
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
else
  echo "🏭 Running in production mode..." >&2
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
fi
