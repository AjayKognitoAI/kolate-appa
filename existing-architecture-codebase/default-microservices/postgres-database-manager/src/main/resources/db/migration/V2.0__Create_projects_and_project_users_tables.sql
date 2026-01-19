-- Create projects and project_users tables
-- This migration creates the remaining tables for the project management system

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100)
);

-- Create unique constraint on project name
ALTER TABLE projects ADD CONSTRAINT uk_projects_name UNIQUE (name);

-- Create indexes for better performance on projects table
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Create project_users junction table
CREATE TABLE project_users (
    project_id UUID NOT NULL,
    user_auth0_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (project_id, user_auth0_id)
);

-- ====== 3. Update project_users ======
-- Add foreign key constraints
ALTER TABLE project_users
    ADD CONSTRAINT fk_project_users_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_users
    ADD CONSTRAINT fk_project_users_user
    FOREIGN KEY (user_auth0_id) REFERENCES users(auth0_id) ON DELETE CASCADE;

-- Create indexes for better performance on project_users table
CREATE INDEX idx_project_users_project_id ON project_users(project_id);
CREATE INDEX idx_project_users_user_auth0_id ON project_users(user_auth0_id);

-- Create trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for projects table to auto-update updated_at
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();