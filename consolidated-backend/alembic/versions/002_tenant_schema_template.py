"""Tenant schema template tables migration

Revision ID: 002_tenant_schema
Revises: 001_enterprise_models
Create Date: 2026-01-19

Creates the SQL function and template for tenant-specific tables.
These tables are created in org_xxx schemas when a new tenant is provisioned.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_tenant_schema'
down_revision = '001_enterprise_models'
branch_labels = None
depends_on = None


# SQL function to create tenant schema with all required tables
TENANT_SCHEMA_SQL = """
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_id TEXT)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT;
BEGIN
    schema_name := 'org_' || tenant_id;

    -- Create the schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

    -- Projects table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT ''ACTIVE'',
            created_by VARCHAR(128),
            updated_by VARCHAR(128),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )', schema_name);

    -- Project roles table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.project_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES %I.projects(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            default_role_id UUID REFERENCES public.default_roles(id),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )', schema_name, schema_name);

    -- Project permissions table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.project_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            role_id UUID NOT NULL REFERENCES %I.project_roles(id) ON DELETE CASCADE,
            module VARCHAR(50) NOT NULL,
            access_type VARCHAR(50) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )', schema_name, schema_name);

    -- Project users table (junction)
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.project_users (
            id SERIAL PRIMARY KEY,
            project_id UUID NOT NULL REFERENCES %I.projects(id) ON DELETE CASCADE,
            user_auth0_id VARCHAR(128) NOT NULL,
            role_id UUID REFERENCES %I.project_roles(id) ON DELETE SET NULL,
            joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(project_id, user_auth0_id)
        )', schema_name, schema_name, schema_name);

    -- Bookmarks table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.bookmarks (
            id SERIAL PRIMARY KEY,
            user_auth0_id VARCHAR(128) NOT NULL,
            project_id UUID NOT NULL REFERENCES %I.projects(id) ON DELETE CASCADE,
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(user_auth0_id, project_id)
        )', schema_name, schema_name);

    -- Notifications table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_auth0_id VARCHAR(128) NOT NULL,
            notification_type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            data JSONB DEFAULT ''{}''::jsonb,
            project_id UUID REFERENCES %I.projects(id) ON DELETE CASCADE,
            read_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )', schema_name, schema_name);

    -- Create indexes
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_projects_status ON %I.projects(status)', tenant_id, schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_project_users_project ON %I.project_users(project_id)', tenant_id, schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_project_users_user ON %I.project_users(user_auth0_id)', tenant_id, schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_bookmarks_user ON %I.bookmarks(user_auth0_id)', tenant_id, schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_notifications_user ON %I.notifications(user_auth0_id)', tenant_id, schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_notifications_read ON %I.notifications(user_auth0_id, read_at)', tenant_id, schema_name);

END;
$$ LANGUAGE plpgsql;
"""

DROP_TENANT_SCHEMA_SQL = """
CREATE OR REPLACE FUNCTION drop_tenant_schema(tenant_id TEXT)
RETURNS VOID AS $$
DECLARE
    schema_name TEXT;
BEGIN
    schema_name := 'org_' || tenant_id;
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
END;
$$ LANGUAGE plpgsql;
"""


def upgrade() -> None:
    # Create the tenant schema creation function
    op.execute(TENANT_SCHEMA_SQL)
    op.execute(DROP_TENANT_SCHEMA_SQL)


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS create_tenant_schema(TEXT)")
    op.execute("DROP FUNCTION IF EXISTS drop_tenant_schema(TEXT)")
