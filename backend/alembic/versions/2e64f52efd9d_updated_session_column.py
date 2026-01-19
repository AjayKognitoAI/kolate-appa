"""Updated session column: convert integer IDs to UUID and provide downgrade with incremental ints

Revision ID: 2e64f52efd9d
Revises: 587cb8a9ba7b
Create Date: 2025-09-30 10:41:12.378227
"""
from alembic import op
import sqlalchemy as sa
import uuid

# revision identifiers, used by Alembic.
revision = '2e64f52efd9d'
down_revision = '587cb8a9ba7b'
branch_labels = None
depends_on = None

TABLE = "user_sessions"
IDX_ID = "ix_user_sessions_id"      # from your DDL
# ix_user_sessions_jti stays as-is and doesn't need touching


def _get_pk_name(conn, table_name: str) -> str:
    insp = sa.inspect(conn)
    pk = insp.get_pk_constraint(table_name)
    # On most DBs 'name' is present; be defensive just in case.
    name = pk.get("name")
    if not name:
        raise RuntimeError(f"Could not determine primary key constraint name for '{table_name}'")
    return name


def upgrade() -> None:
    conn = op.get_bind()

    # 1) Add a temporary UUID column (nullable until backfilled)
    op.add_column(TABLE, sa.Column("uuid_id", sa.String(length=36), nullable=True))

    # 2) Backfill UUIDv4 values for all rows
    rows = conn.execute(sa.text(f"SELECT id FROM {TABLE}")).fetchall()
    for (old_id,) in rows:
        conn.execute(
            sa.text(f"UPDATE {TABLE} SET uuid_id = :uuid WHERE id = :old_id"),
            {"uuid": str(uuid.uuid4()), "old_id": old_id},
        )

    # 3) Drop index on id (it points to the old column definition)
    #    Safe to attempt directly because your DDL shows this exact name.
    op.drop_index(IDX_ID, table_name=TABLE)

    # 4) Swap columns: drop PK, drop old 'id', rename 'uuid_id' -> 'id', recreate PK and index
    pk_name = _get_pk_name(conn, TABLE)
    op.drop_constraint(pk_name, TABLE, type_="primary")

    # Drop the old integer 'id' column
    op.drop_column(TABLE, "id")

    # Rename uuid_id -> id (and make it NOT NULL)
    op.alter_column(TABLE, "uuid_id", new_column_name="id", existing_type=sa.String(length=36), nullable=False)

    # Recreate the primary key on the new 'id'
    op.create_primary_key(pk_name, TABLE, ["id"])

    # Recreate the (non-unique) index on id to mirror the original
    op.create_index(IDX_ID, TABLE, ["id"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()

    # 1) Add a temporary integer column
    op.add_column(TABLE, sa.Column("int_id", sa.Integer(), nullable=True))

    # 2) Assign incremental integers starting at 1, ordered by current UUID (deterministic)
    uuids = conn.execute(sa.text(f"SELECT id FROM {TABLE} ORDER BY id ASC")).fetchall()
    counter = 1
    for (uuid_id,) in uuids:
        conn.execute(
            sa.text(f"UPDATE {TABLE} SET int_id = :new_id WHERE id = :uuid_id"),
            {"new_id": counter, "uuid_id": uuid_id},
        )
        counter += 1

    # 3) Drop index on id (it points to the UUID column)
    op.drop_index(IDX_ID, table_name=TABLE)

    # 4) Swap columns back: drop PK, drop UUID 'id', rename int_id -> id, recreate PK and index
    pk_name = _get_pk_name(conn, TABLE)
    op.drop_constraint(pk_name, TABLE, type_="primary")

    # Drop the UUID 'id' column
    op.drop_column(TABLE, "id")

    # Rename int_id -> id and make NOT NULL
    op.alter_column(TABLE, "int_id", new_column_name="id", existing_type=sa.Integer(), nullable=False)

    # Recreate the primary key on integer id
    op.create_primary_key(pk_name, TABLE, ["id"])

    # Recreate the (non-unique) index on id to mirror the original
    op.create_index(IDX_ID, TABLE, ["id"], unique=False)
