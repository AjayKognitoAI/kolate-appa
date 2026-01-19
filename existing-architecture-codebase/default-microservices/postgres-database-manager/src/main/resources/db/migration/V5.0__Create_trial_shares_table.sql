-- V5.0__Create_trial_shares_table.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE trial_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    trial_slug VARCHAR(255) NOT NULL,
    execution_id VARCHAR(255),
    sender_id VARCHAR(255) NOT NULL,
    recipients TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_trial_shares_sender_id ON trial_shares(sender_id);
CREATE INDEX idx_trial_shares_project_trial ON trial_shares(project_id, trial_slug);
CREATE INDEX idx_trial_shares_created_at ON trial_shares(created_at);
