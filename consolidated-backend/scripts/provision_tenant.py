#!/usr/bin/env python3
"""
Tenant Provisioning Script

Creates a new tenant schema in PostgreSQL and optionally
sets up the MongoDB database for the tenant.

Usage:
    python scripts/provision_tenant.py <org_id>
    python scripts/provision_tenant.py <org_id> --with-mongo
"""

import asyncio
import argparse
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker


async def create_postgres_tenant_schema(database_url: str, org_id: str):
    """
    Create a new tenant schema in PostgreSQL using the create_tenant_schema function.

    Args:
        database_url: PostgreSQL connection URL (async format)
        org_id: Organization ID for the new tenant
    """
    print(f"\nCreating PostgreSQL schema for tenant: org_{org_id}")

    # Create async engine
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # Check if schema already exists
            result = await session.execute(
                text("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.schemata
                        WHERE schema_name = :schema_name
                    )
                """),
                {"schema_name": f"org_{org_id}"}
            )
            exists = result.scalar()

            if exists:
                print(f"Schema org_{org_id} already exists. Skipping creation.")
                return False

            # Create the tenant schema using the stored function
            await session.execute(
                text("SELECT create_tenant_schema(:org_id)"),
                {"org_id": org_id}
            )
            await session.commit()

            print(f"Successfully created schema: org_{org_id}")

            # Verify tables were created
            result = await session.execute(
                text("""
                    SELECT table_name FROM information_schema.tables
                    WHERE table_schema = :schema_name
                    ORDER BY table_name
                """),
                {"schema_name": f"org_{org_id}"}
            )
            tables = [row[0] for row in result.fetchall()]
            print(f"Created tables: {', '.join(tables)}")

            return True

        except Exception as e:
            print(f"Error creating tenant schema: {e}")
            await session.rollback()
            raise

    await engine.dispose()


async def create_mongo_tenant_database(mongo_uri: str, org_id: str):
    """
    Create a MongoDB database for the tenant.

    Args:
        mongo_uri: MongoDB connection URI
        org_id: Organization ID for the new tenant
    """
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
    except ImportError:
        print("Warning: motor not installed. Skipping MongoDB setup.")
        return False

    database_name = f"kolate_{org_id}"
    print(f"\nCreating MongoDB database for tenant: {database_name}")

    client = AsyncIOMotorClient(mongo_uri)

    try:
        # Test connection
        await client.admin.command('ping')

        db = client[database_name]

        # Create metadata collection
        await db.create_collection("_metadata")
        metadata = db["_metadata"]

        from datetime import datetime
        await metadata.insert_one({
            "org_id": org_id,
            "created_at": datetime.utcnow(),
            "version": "1.0",
            "collections": []
        })

        print(f"Successfully created MongoDB database: {database_name}")
        return True

    except Exception as e:
        print(f"Error creating MongoDB database: {e}")
        raise

    finally:
        client.close()


async def list_tenants(database_url: str):
    """List all existing tenant schemas."""
    print("\nExisting tenant schemas:")

    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            text("""
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name LIKE 'org_%'
                ORDER BY schema_name
            """)
        )
        schemas = [row[0] for row in result.fetchall()]

        if schemas:
            for schema in schemas:
                print(f"  - {schema}")
        else:
            print("  (no tenant schemas found)")

    await engine.dispose()


async def delete_tenant(database_url: str, org_id: str, confirm: bool = False):
    """
    Delete a tenant schema (DANGEROUS!).

    Args:
        database_url: PostgreSQL connection URL
        org_id: Organization ID to delete
        confirm: Must be True to actually delete
    """
    if not confirm:
        print(f"WARNING: This will permanently delete all data for org_{org_id}!")
        print("Add --confirm flag to proceed.")
        return False

    print(f"\nDeleting PostgreSQL schema for tenant: org_{org_id}")

    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            await session.execute(
                text("SELECT drop_tenant_schema(:org_id)"),
                {"org_id": org_id}
            )
            await session.commit()
            print(f"Successfully deleted schema: org_{org_id}")
            return True

        except Exception as e:
            print(f"Error deleting tenant schema: {e}")
            await session.rollback()
            raise

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(
        description="Provision or manage tenant schemas",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Create a new tenant
    python scripts/provision_tenant.py abc123

    # Create tenant with MongoDB database
    python scripts/provision_tenant.py abc123 --with-mongo

    # List all tenants
    python scripts/provision_tenant.py --list

    # Delete a tenant (careful!)
    python scripts/provision_tenant.py abc123 --delete --confirm
        """
    )

    parser.add_argument(
        "org_id",
        nargs="?",
        help="Organization ID for the tenant"
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/kolate_db"),
        help="PostgreSQL connection URL"
    )
    parser.add_argument(
        "--mongo-uri",
        default=os.getenv("MONGODB_URI", "mongodb://localhost:27017"),
        help="MongoDB connection URI"
    )
    parser.add_argument(
        "--with-mongo",
        action="store_true",
        help="Also create MongoDB database for the tenant"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all existing tenant schemas"
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete the tenant schema instead of creating"
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Confirm destructive operations"
    )

    args = parser.parse_args()

    if args.list:
        asyncio.run(list_tenants(args.database_url))
        return

    if not args.org_id:
        parser.error("org_id is required (unless using --list)")

    if args.delete:
        asyncio.run(delete_tenant(args.database_url, args.org_id, args.confirm))
    else:
        # Create tenant
        asyncio.run(create_postgres_tenant_schema(args.database_url, args.org_id))

        if args.with_mongo:
            asyncio.run(create_mongo_tenant_database(args.mongo_uri, args.org_id))


if __name__ == "__main__":
    main()
