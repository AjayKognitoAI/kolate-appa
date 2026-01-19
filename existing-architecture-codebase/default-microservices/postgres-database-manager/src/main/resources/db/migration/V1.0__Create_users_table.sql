-- Initial schema creation
-- Create users table with all required fields

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth0_id VARCHAR(255),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    job_title VARCHAR(255),
    last_name VARCHAR(255),
    mobile VARCHAR(20),
    organization_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_auth0_id ON users(auth0_id);

-- Create unique constraint on email
ALTER TABLE users ADD CONSTRAINT uk_users_email UNIQUE (email);

-- Add unique constraint to auth0_id in users table
-- This is required before creating foreign key references to auth0_id

-- First, ensure auth0_id is not null since it will be referenced
ALTER TABLE users ALTER COLUMN auth0_id SET NOT NULL;

-- Add unique constraint on auth0_id
ALTER TABLE users ADD CONSTRAINT uk_users_auth0_id UNIQUE (auth0_id);
