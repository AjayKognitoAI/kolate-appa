"""
Example Migration: Task Table

This is an example of what an Alembic migration file looks like
for creating the tasks table.

HOW TO CREATE MIGRATIONS:
1. Create/modify your model in app/models/
2. Run: make migrate-create
3. Enter a descriptive message (e.g., "add tasks table")
4. Review the auto-generated migration file
5. Apply it: make migrate

IMPORTANT:
- This file is just an EXAMPLE for reference
- DO NOT manually create migration files in examples/
- Let Alembic auto-generate them in alembic/versions/
- Always review auto-generated migrations before applying

Migration File Structure:
- revision: Unique ID for this migration
- down_revision: Previous migration ID (creates a chain)
- upgrade(): Apply the migration (forward)
- downgrade(): Revert the migration (backward)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'abc123def456'  # Auto-generated unique ID
down_revision = '97bf7897aed1'  # Points to previous migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Apply the migration (create tables, add columns, etc.)

    This runs when you execute: make migrate
    or: alembic upgrade head
    """

    # Create the tasks table
    op.create_table(
        'tasks',

        # Primary key (inherited from BaseModel)
        sa.Column('id', sa.String(length=36), nullable=False),

        # Task fields
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),

        # Foreign key to users table
        sa.Column('user_id', sa.String(length=36), nullable=False),

        # Timestamps (inherited from BaseModel)
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),

        # Primary key constraint
        sa.PrimaryKeyConstraint('id'),

        # Foreign key constraint
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )

    # Create indexes for better query performance
    op.create_index('ix_tasks_title', 'tasks', ['title'])
    op.create_index('ix_tasks_user_id', 'tasks', ['user_id'])
    op.create_index('ix_tasks_user_completed', 'tasks', ['user_id', 'is_completed'])
    op.create_index('ix_tasks_user_title', 'tasks', ['user_id', 'title'])


def downgrade() -> None:
    """
    Revert the migration (drop tables, remove columns, etc.)

    This runs when you execute: alembic downgrade -1
    or: alembic downgrade <revision>

    IMPORTANT: Always provide a downgrade path for rollbacks
    """

    # Drop indexes first
    op.drop_index('ix_tasks_user_title', table_name='tasks')
    op.drop_index('ix_tasks_user_completed', table_name='tasks')
    op.drop_index('ix_tasks_user_id', table_name='tasks')
    op.drop_index('ix_tasks_title', table_name='tasks')

    # Drop the table
    op.drop_table('tasks')


# ============================================================================
# Common Migration Operations
# ============================================================================

"""
# 1. ADD A COLUMN
def upgrade():
    op.add_column('tasks',
        sa.Column('priority', sa.String(length=20), nullable=True)
    )

def downgrade():
    op.drop_column('tasks', 'priority')


# 2. MODIFY A COLUMN
def upgrade():
    op.alter_column('tasks', 'title',
        existing_type=sa.String(length=255),
        type_=sa.String(length=500),  # Increase length
        nullable=False
    )

def downgrade():
    op.alter_column('tasks', 'title',
        existing_type=sa.String(length=500),
        type_=sa.String(length=255),
        nullable=False
    )


# 3. ADD AN INDEX
def upgrade():
    op.create_index('ix_tasks_created_at', 'tasks', ['created_at'])

def downgrade():
    op.drop_index('ix_tasks_created_at', table_name='tasks')


# 4. ADD A FOREIGN KEY
def upgrade():
    op.create_foreign_key(
        'fk_tasks_category',  # Constraint name
        'tasks',              # Source table
        'categories',         # Target table
        ['category_id'],      # Source column
        ['id'],               # Target column
        ondelete='SET NULL'   # What to do when parent is deleted
    )

def downgrade():
    op.drop_constraint('fk_tasks_category', 'tasks', type_='foreignkey')


# 5. CREATE AN ENUM TYPE (PostgreSQL)
def upgrade():
    # Create enum type
    task_priority = postgresql.ENUM('low', 'medium', 'high',
                                     name='taskpriority')
    task_priority.create(op.get_bind())

    # Add column using the enum
    op.add_column('tasks',
        sa.Column('priority', task_priority, nullable=False,
                  server_default='medium')
    )

def downgrade():
    op.drop_column('tasks', 'priority')
    # Drop enum type
    task_priority = postgresql.ENUM('low', 'medium', 'high',
                                     name='taskpriority')
    task_priority.drop(op.get_bind())


# 6. DATA MIGRATION (Update existing data)
def upgrade():
    # Add a new column
    op.add_column('tasks',
        sa.Column('slug', sa.String(length=255), nullable=True)
    )

    # Update existing rows
    connection = op.get_bind()
    connection.execute(
        sa.text("UPDATE tasks SET slug = LOWER(REPLACE(title, ' ', '-'))")
    )

    # Make the column non-nullable after populating
    op.alter_column('tasks', 'slug', nullable=False)

def downgrade():
    op.drop_column('tasks', 'slug')


# 7. RENAME A TABLE
def upgrade():
    op.rename_table('tasks', 'todos')

def downgrade():
    op.rename_table('todos', 'tasks')


# 8. RENAME A COLUMN
def upgrade():
    op.alter_column('tasks', 'is_completed',
                    new_column_name='completed')

def downgrade():
    op.alter_column('tasks', 'completed',
                    new_column_name='is_completed')


# 9. ADD UNIQUE CONSTRAINT
def upgrade():
    op.create_unique_constraint(
        'uq_tasks_user_title',  # Constraint name
        'tasks',                # Table name
        ['user_id', 'title']    # Columns
    )

def downgrade():
    op.drop_constraint('uq_tasks_user_title', 'tasks', type_='unique')


# 10. ADD CHECK CONSTRAINT
def upgrade():
    op.create_check_constraint(
        'ck_tasks_title_not_empty',
        'tasks',
        "LENGTH(TRIM(title)) > 0"
    )

def downgrade():
    op.drop_constraint('ck_tasks_title_not_empty', 'tasks', type_='check')
"""


# ============================================================================
# Migration Best Practices
# ============================================================================

"""
1. ALWAYS REVIEW AUTO-GENERATED MIGRATIONS
   - Alembic is smart but not perfect
   - Check for missing operations
   - Verify data types are correct

2. ALWAYS PROVIDE DOWNGRADE
   - Enable rollback capability
   - Test downgrade works
   - Some operations can't be reversed (data loss)

3. BREAK UP LARGE MIGRATIONS
   - One logical change per migration
   - Easier to review and rollback
   - Better git history

4. TEST MIGRATIONS
   - Test on development database first
   - Test both upgrade and downgrade
   - Test with production-like data

5. HANDLE DATA CAREFULLY
   - Back up production data before migrating
   - Consider data migration impact
   - Plan for zero-downtime deployments

6. USE BATCH OPERATIONS
   - For large tables, use batch_alter_table
   - Reduces locking time
   - Better for production systems

7. DOCUMENT COMPLEX MIGRATIONS
   - Add comments explaining WHY
   - Note any manual steps required
   - Document rollback procedures

8. VERSION CONTROL
   - Commit migrations to git
   - Never modify already-applied migrations
   - Create new migration to fix issues
"""


# ============================================================================
# How to Create and Apply Migrations
# ============================================================================

"""
# 1. CREATE YOUR MODEL
# Edit app/models/task.py and define your model

# 2. GENERATE MIGRATION
make migrate-create
# Or: docker-compose exec web alembic revision --autogenerate -m "add tasks table"

# 3. REVIEW THE GENERATED FILE
# Check alembic/versions/<revision>_add_tasks_table.py
# Verify upgrade() and downgrade() are correct

# 4. APPLY MIGRATION
make migrate
# Or: docker-compose exec web alembic upgrade head

# 5. CHECK MIGRATION STATUS
docker-compose exec web alembic current
# Shows current database revision

# 6. VIEW MIGRATION HISTORY
docker-compose exec web alembic history
# Shows all migrations

# 7. ROLLBACK IF NEEDED
docker-compose exec web alembic downgrade -1
# Goes back one migration

# 8. ROLLBACK TO SPECIFIC VERSION
docker-compose exec web alembic downgrade <revision>
"""
