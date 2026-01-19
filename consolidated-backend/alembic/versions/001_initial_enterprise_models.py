"""Initial enterprise and tenant models migration

Revision ID: 001_enterprise_models
Revises: 583cacebc8ce
Create Date: 2026-01-19

Creates all tables for the consolidated backend:
- Public schema: enterprises, admins, modules, trials, enterprise_module_access, etc.
- Tenant schema template: projects, project_users, project_roles, bookmarks, notifications
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_enterprise_models'
down_revision = '583cacebc8ce'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ============================================================
    # PUBLIC SCHEMA TABLES (Shared across all tenants)
    # ============================================================

    # Enterprises table
    op.create_table(
        'enterprises',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('organization_id', sa.String(64), unique=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('url', sa.String(500)),
        sa.Column('domain', sa.String(255)),
        sa.Column('description', sa.Text()),
        sa.Column('logo_url', sa.String(500)),
        sa.Column('admin_email', sa.String(255), nullable=False),
        sa.Column('zip_code', sa.String(20)),
        sa.Column('region', sa.String(100)),
        sa.Column('size', sa.String(50)),
        sa.Column('contact_number', sa.String(50)),
        sa.Column('status', sa.String(20), server_default='PENDING', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        schema='public'
    )

    # Admins table
    op.create_table(
        'admins',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('enterprise_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('public.enterprises.id', ondelete='CASCADE'), nullable=False),
        sa.Column('auth0_user_id', sa.String(128), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(100)),
        sa.Column('last_name', sa.String(100)),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        schema='public'
    )

    # Enterprise datasources table
    op.create_table(
        'enterprise_datasources',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('enterprise_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('public.enterprises.id', ondelete='CASCADE'), nullable=False),
        sa.Column('datasource_name', sa.String(255), nullable=False),
        sa.Column('datasource_type', sa.String(50), nullable=False),
        sa.Column('connection_string', sa.Text(), nullable=False),  # Should be encrypted
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        schema='public'
    )

    # Enterprise onboarding progress table
    op.create_table(
        'enterprise_onboarding_progress',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('enterprise_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('public.enterprises.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('current_step', sa.String(50), nullable=False),
        sa.Column('steps_completed', postgresql.JSONB(), server_default='[]'),
        sa.Column('is_completed', sa.Boolean(), server_default='false'),
        sa.Column('completed_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        schema='public'
    )

    # SSO tickets table
    op.create_table(
        'sso_tickets',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('enterprise_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('public.enterprises.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(128), nullable=False),
        sa.Column('ticket', sa.String(255), unique=True, nullable=False),
        sa.Column('target_url', sa.String(500)),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        schema='public'
    )

    # Modules table
    op.create_table(
        'modules',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        schema='public'
    )

    # Trials table
    op.create_table(
        'trials',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('module_id', sa.Integer(), sa.ForeignKey('public.modules.id', ondelete='CASCADE'), nullable=False),
        sa.Column('slug', sa.String(100), unique=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('icon_url', sa.String(500)),
        sa.Column('description', sa.Text()),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        schema='public'
    )

    # Enterprise module access table
    op.create_table(
        'enterprise_module_access',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('enterprise_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('public.enterprises.id', ondelete='CASCADE'), nullable=False),
        sa.Column('module_id', sa.Integer(), sa.ForeignKey('public.modules.id', ondelete='CASCADE'), nullable=False),
        sa.Column('trial_id', sa.Integer(), sa.ForeignKey('public.trials.id', ondelete='SET NULL')),
        sa.Column('access_level', sa.String(50), server_default='FULL', nullable=False),
        sa.Column('granted_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('expires_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.UniqueConstraint('enterprise_id', 'module_id', name='uq_enterprise_module'),
        schema='public'
    )

    # Default roles table (template roles)
    op.create_table(
        'default_roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        schema='public'
    )

    # Default permissions table
    op.create_table(
        'default_permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True),
        sa.Column('default_role_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('public.default_roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('module', sa.String(50), nullable=False),
        sa.Column('access_type', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        schema='public'
    )

    # ============================================================
    # PUBLIC SCHEMA INDEXES
    # ============================================================

    op.create_index('idx_enterprises_org_id', 'enterprises', ['organization_id'], schema='public')
    op.create_index('idx_enterprises_domain', 'enterprises', ['domain'], schema='public')
    op.create_index('idx_enterprises_status', 'enterprises', ['status'], schema='public')
    op.create_index('idx_enterprises_admin_email', 'enterprises', ['admin_email'], schema='public')

    op.create_index('idx_admins_enterprise', 'admins', ['enterprise_id'], schema='public')
    op.create_index('idx_admins_auth0_id', 'admins', ['auth0_user_id'], schema='public')

    op.create_index('idx_sso_tickets_ticket', 'sso_tickets', ['ticket'], schema='public')
    op.create_index('idx_sso_tickets_expires', 'sso_tickets', ['expires_at'], schema='public')

    op.create_index('idx_trials_module', 'trials', ['module_id'], schema='public')
    op.create_index('idx_trials_slug', 'trials', ['slug'], schema='public')

    op.create_index('idx_module_access_enterprise', 'enterprise_module_access', ['enterprise_id'], schema='public')
    op.create_index('idx_module_access_module', 'enterprise_module_access', ['module_id'], schema='public')


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('idx_module_access_module', table_name='enterprise_module_access', schema='public')
    op.drop_index('idx_module_access_enterprise', table_name='enterprise_module_access', schema='public')
    op.drop_index('idx_trials_slug', table_name='trials', schema='public')
    op.drop_index('idx_trials_module', table_name='trials', schema='public')
    op.drop_index('idx_sso_tickets_expires', table_name='sso_tickets', schema='public')
    op.drop_index('idx_sso_tickets_ticket', table_name='sso_tickets', schema='public')
    op.drop_index('idx_admins_auth0_id', table_name='admins', schema='public')
    op.drop_index('idx_admins_enterprise', table_name='admins', schema='public')
    op.drop_index('idx_enterprises_admin_email', table_name='enterprises', schema='public')
    op.drop_index('idx_enterprises_status', table_name='enterprises', schema='public')
    op.drop_index('idx_enterprises_domain', table_name='enterprises', schema='public')
    op.drop_index('idx_enterprises_org_id', table_name='enterprises', schema='public')

    # Drop tables in reverse order
    op.drop_table('default_permissions', schema='public')
    op.drop_table('default_roles', schema='public')
    op.drop_table('enterprise_module_access', schema='public')
    op.drop_table('trials', schema='public')
    op.drop_table('modules', schema='public')
    op.drop_table('sso_tickets', schema='public')
    op.drop_table('enterprise_onboarding_progress', schema='public')
    op.drop_table('enterprise_datasources', schema='public')
    op.drop_table('admins', schema='public')
    op.drop_table('enterprises', schema='public')
