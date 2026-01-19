#!/usr/bin/env python3
"""
MongoDB Setup Script

Sets up MongoDB collections and indexes for the Kolate application.
This script creates the necessary collections with validation schemas
and performance indexes.

Usage:
    python scripts/setup_mongo.py
    python scripts/setup_mongo.py --uri mongodb://localhost:27017
"""

import asyncio
import argparse
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import CollectionInvalid


# Default MongoDB URI
DEFAULT_MONGO_URI = "mongodb://localhost:27017"
DEFAULT_DATABASE = "kolate_db"


async def setup_collection(db, collection_name: str, validator: dict, indexes: list):
    """Create a collection with validation and indexes."""
    try:
        # Create collection with validator
        await db.create_collection(
            collection_name,
            validator=validator
        )
        print(f"  Created collection: {collection_name}")
    except CollectionInvalid:
        # Collection already exists, update validator
        await db.command({
            "collMod": collection_name,
            "validator": validator
        })
        print(f"  Updated validation for: {collection_name}")

    # Create indexes
    collection = db[collection_name]
    for index_spec in indexes:
        if isinstance(index_spec, tuple):
            keys, options = index_spec
            await collection.create_index(keys, **options)
        else:
            await collection.create_index(index_spec)
    print(f"  Created {len(indexes)} indexes for: {collection_name}")


async def setup_mongodb(uri: str = DEFAULT_MONGO_URI, database: str = DEFAULT_DATABASE):
    """
    Set up MongoDB with all required collections and indexes.

    The multi-tenant approach uses:
    - One database per organization (e.g., kolate_org_abc123)
    - Collection naming: {project_id}_{trial_slug}_patient_records
    - Collection naming: {project_id}_{trial_slug}_prediction_results
    """
    print(f"\nConnecting to MongoDB at {uri}...")
    client = AsyncIOMotorClient(uri)

    # Test connection
    try:
        await client.admin.command('ping')
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        sys.exit(1)

    # Set up the default/template database
    db = client[database]
    print(f"\nSetting up database: {database}")

    # ============================================================
    # Patient Records Collection Template
    # ============================================================
    patient_records_validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["record_id", "patient_data", "created_at"],
            "properties": {
                "record_id": {
                    "bsonType": "string",
                    "description": "Unique identifier for the patient record"
                },
                "patient_data": {
                    "bsonType": "object",
                    "description": "Patient demographic and clinical data"
                },
                "metadata": {
                    "bsonType": "object",
                    "description": "Additional metadata"
                },
                "created_at": {
                    "bsonType": "date",
                    "description": "Record creation timestamp"
                },
                "updated_at": {
                    "bsonType": "date",
                    "description": "Last update timestamp"
                }
            }
        }
    }

    patient_records_indexes = [
        "record_id",
        [("created_at", -1)],
        ([("record_id", 1)], {"unique": True}),
    ]

    await setup_collection(
        db,
        "patient_records_template",
        patient_records_validator,
        patient_records_indexes
    )

    # ============================================================
    # Execution Records (Prediction Results) Collection Template
    # ============================================================
    execution_records_validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["execution_id", "user_id", "executed_at"],
            "properties": {
                "execution_id": {
                    "bsonType": "string",
                    "description": "Unique identifier for the execution"
                },
                "user_id": {
                    "bsonType": "string",
                    "description": "Auth0 user ID who triggered the execution"
                },
                "base_patient_data": {
                    "bsonType": "object",
                    "description": "Input patient data for the prediction"
                },
                "base_prediction": {
                    "bsonType": "array",
                    "description": "Prediction results from models"
                },
                "executed_by": {
                    "bsonType": "string",
                    "description": "Auth0 user ID of executor"
                },
                "executed_at": {
                    "bsonType": "date",
                    "description": "Execution timestamp"
                },
                "updated_by": {
                    "bsonType": ["string", "null"],
                    "description": "Auth0 user ID of last updater"
                },
                "updated_at": {
                    "bsonType": "date",
                    "description": "Last update timestamp"
                }
            }
        }
    }

    execution_records_indexes = [
        "execution_id",
        "user_id",
        "executed_by",
        [("executed_at", -1)],
        [("user_id", 1), ("executed_at", -1)],
        ([("execution_id", 1)], {"unique": True}),
    ]

    await setup_collection(
        db,
        "execution_records_template",
        execution_records_validator,
        execution_records_indexes
    )

    # ============================================================
    # Audit Log Collection (Optional)
    # ============================================================
    audit_log_validator = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["action", "user_id", "timestamp"],
            "properties": {
                "action": {
                    "bsonType": "string",
                    "description": "Action performed (create, read, update, delete)"
                },
                "user_id": {
                    "bsonType": "string",
                    "description": "User who performed the action"
                },
                "resource_type": {
                    "bsonType": "string",
                    "description": "Type of resource affected"
                },
                "resource_id": {
                    "bsonType": "string",
                    "description": "ID of the affected resource"
                },
                "changes": {
                    "bsonType": "object",
                    "description": "Before/after state of changes"
                },
                "ip_address": {
                    "bsonType": "string",
                    "description": "IP address of the requester"
                },
                "timestamp": {
                    "bsonType": "date",
                    "description": "When the action occurred"
                }
            }
        }
    }

    audit_log_indexes = [
        "user_id",
        "resource_type",
        [("timestamp", -1)],
        [("user_id", 1), ("timestamp", -1)],
        [("resource_type", 1), ("resource_id", 1)],
    ]

    await setup_collection(
        db,
        "audit_logs",
        audit_log_validator,
        audit_log_indexes
    )

    print(f"\nMongoDB setup complete for database: {database}")
    print("\nNote: Tenant-specific databases (e.g., kolate_org_abc123) will be")
    print("created automatically when tenants are provisioned.")

    # Close connection
    client.close()


async def create_tenant_database(uri: str, org_id: str):
    """
    Create a tenant-specific database with required collections.

    Args:
        uri: MongoDB connection URI
        org_id: Organization/tenant ID
    """
    database_name = f"kolate_{org_id}"
    print(f"\nCreating tenant database: {database_name}")

    client = AsyncIOMotorClient(uri)
    db = client[database_name]

    # Create the same structure as the template
    # Patient records and execution records collections will be created
    # dynamically per project/trial combination

    # Create a metadata collection for the tenant
    await db.create_collection("_metadata")
    metadata = db["_metadata"]
    await metadata.insert_one({
        "org_id": org_id,
        "created_at": asyncio.get_event_loop().time(),
        "version": "1.0"
    })

    print(f"Tenant database created: {database_name}")
    client.close()


def main():
    parser = argparse.ArgumentParser(description="Set up MongoDB for Kolate application")
    parser.add_argument(
        "--uri",
        default=DEFAULT_MONGO_URI,
        help=f"MongoDB connection URI (default: {DEFAULT_MONGO_URI})"
    )
    parser.add_argument(
        "--database",
        default=DEFAULT_DATABASE,
        help=f"Database name (default: {DEFAULT_DATABASE})"
    )
    parser.add_argument(
        "--create-tenant",
        metavar="ORG_ID",
        help="Create a tenant-specific database for the given org ID"
    )

    args = parser.parse_args()

    if args.create_tenant:
        asyncio.run(create_tenant_database(args.uri, args.create_tenant))
    else:
        asyncio.run(setup_mongodb(args.uri, args.database))


if __name__ == "__main__":
    main()
