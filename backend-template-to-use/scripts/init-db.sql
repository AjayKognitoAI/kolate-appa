-- Initialize the database for MindTrip GigConnect
-- This script runs when PostgreSQL container starts up

-- Create the main database if it doesn't exist
SELECT 'CREATE DATABASE mindtrip_gigconnect_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mindtrip_gigconnect_dev')\gexec

-- Connect to the database
\c mindtrip_gigconnect_dev;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a schema for the application
CREATE SCHEMA IF NOT EXISTS mindtrip;

-- Set default privileges
GRANT ALL PRIVILEGES ON DATABASE mindtrip_gigconnect_dev TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA mindtrip TO postgres;

-- Add any initial setup here
SELECT 'Database initialization completed' as status;