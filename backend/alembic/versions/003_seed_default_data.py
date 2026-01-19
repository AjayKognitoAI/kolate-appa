"""Seed default roles and permissions

Revision ID: 003_seed_data
Revises: 002_tenant_schema
Create Date: 2026-01-19

Seeds the default roles and permissions that serve as templates
for project roles in tenant schemas.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = '003_seed_data'
down_revision = '002_tenant_schema'
branch_labels = None
depends_on = None

# Default roles and their permissions
DEFAULT_ROLES = [
    {
        'id': str(uuid.uuid4()),
        'name': 'Admin',
        'description': 'Full access to all features and settings',
        'permissions': [
            ('DASHBOARD', 'FULL'),
            ('PROJECTS', 'FULL'),
            ('USERS', 'FULL'),
            ('SETTINGS', 'FULL'),
            ('REPORTS', 'FULL'),
            ('TRIALS', 'FULL'),
        ]
    },
    {
        'id': str(uuid.uuid4()),
        'name': 'Manager',
        'description': 'Can manage projects, users, and view reports',
        'permissions': [
            ('DASHBOARD', 'FULL'),
            ('PROJECTS', 'FULL'),
            ('USERS', 'EDIT'),
            ('SETTINGS', 'VIEW'),
            ('REPORTS', 'FULL'),
            ('TRIALS', 'EDIT'),
        ]
    },
    {
        'id': str(uuid.uuid4()),
        'name': 'Member',
        'description': 'Standard access to projects and trials',
        'permissions': [
            ('DASHBOARD', 'VIEW'),
            ('PROJECTS', 'EDIT'),
            ('USERS', 'VIEW'),
            ('SETTINGS', 'NONE'),
            ('REPORTS', 'VIEW'),
            ('TRIALS', 'EDIT'),
        ]
    },
    {
        'id': str(uuid.uuid4()),
        'name': 'Viewer',
        'description': 'Read-only access to projects and data',
        'permissions': [
            ('DASHBOARD', 'VIEW'),
            ('PROJECTS', 'VIEW'),
            ('USERS', 'NONE'),
            ('SETTINGS', 'NONE'),
            ('REPORTS', 'VIEW'),
            ('TRIALS', 'VIEW'),
        ]
    },
]

# Default modules
DEFAULT_MODULES = [
    {'name': 'Patient Risk Assessment', 'description': 'ML-based patient risk scoring and assessment'},
    {'name': 'Clinical Trial Matching', 'description': 'Match patients to relevant clinical trials'},
    {'name': 'Treatment Outcome Prediction', 'description': 'Predict treatment outcomes based on patient data'},
    {'name': 'Medical Imaging Analysis', 'description': 'AI-powered analysis of medical images'},
]


def upgrade() -> None:
    # Get connection for raw SQL
    connection = op.get_bind()

    # Insert default roles
    for role in DEFAULT_ROLES:
        connection.execute(
            sa.text("""
                INSERT INTO public.default_roles (id, name, description, created_at, updated_at)
                VALUES (:id, :name, :description, NOW(), NOW())
                ON CONFLICT (name) DO NOTHING
            """),
            {'id': role['id'], 'name': role['name'], 'description': role['description']}
        )

        # Insert permissions for this role
        for module, access_type in role['permissions']:
            perm_id = str(uuid.uuid4())
            connection.execute(
                sa.text("""
                    INSERT INTO public.default_permissions (id, default_role_id, module, access_type, created_at, updated_at)
                    VALUES (:id, :role_id, :module, :access_type, NOW(), NOW())
                """),
                {'id': perm_id, 'role_id': role['id'], 'module': module, 'access_type': access_type}
            )

    # Insert default modules
    for module in DEFAULT_MODULES:
        connection.execute(
            sa.text("""
                INSERT INTO public.modules (name, description, is_active, created_at, updated_at)
                VALUES (:name, :description, true, NOW(), NOW())
                ON CONFLICT (name) DO NOTHING
            """),
            {'name': module['name'], 'description': module['description']}
        )


def downgrade() -> None:
    connection = op.get_bind()

    # Delete permissions first (foreign key constraint)
    connection.execute(sa.text("DELETE FROM public.default_permissions"))

    # Delete roles
    connection.execute(sa.text("DELETE FROM public.default_roles"))

    # Delete modules
    for module in DEFAULT_MODULES:
        connection.execute(
            sa.text("DELETE FROM public.modules WHERE name = :name"),
            {'name': module['name']}
        )
