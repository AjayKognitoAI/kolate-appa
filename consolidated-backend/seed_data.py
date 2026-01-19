#!/usr/bin/env python3

import asyncio
import sys
import os
import uuid
from sqlalchemy import create_engine, select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config.settings import settings
from app.models.base import BaseModel

# Import all models to ensure they are registered with SQLAlchemy
from app import models
from app.models.user import User
from app.models.user_auth import UserAuth, AuthType
from app.models.user_session import UserSession
from app.models.role import Role, RolePermission, UserRole
from app.models.permission import Permission
from app.models.feature import Feature
from app.models.action import Action
from app.services.token_service import token_service


def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    engine = create_engine(settings.DATABASE_URL)
    BaseModel.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")


async def seed_default_features_and_actions(db):
    """Seed default features and actions"""
    print("Seeding features and actions...")

    # Default framework features
    features_data = [
        {"name": "users", "description": "User management functionality"},
        {"name": "features", "description": "Feature management functionality"},
        {"name": "actions", "description": "Action management functionality"},
        {"name": "roles", "description": "Role management functionality"},
        {"name": "permissions", "description": "Permission management functionality"},
        {"name": "health", "description": "Health check functionality"},
        {"name": "cache", "description": "Cache management functionality"},
        {"name": "master_data", "description": "Master data management functionality"},
    ]

    # Default actions
    actions_data = [
        {"name": "read", "description": "View/read access"},
        {"name": "write", "description": "Create and modify access"},
        {"name": "delete", "description": "Delete access"},
        {"name": "admin", "description": "Administrative access"},
        {"name": "manage", "description": "Full management access"},
        {"name": "read:self", "description": "Read access to own resources"},
        {"name": "write:self", "description": "Write access to own resources"},
        {"name": "delete:self", "description": "Delete access to own resources"},
    ]

    created_features = {}
    created_actions = {}

    # Create features
    for feature_data in features_data:
        result = await db.execute(
            select(Feature).where(Feature.name == feature_data["name"])
        )
        existing_feature = result.scalar_one_or_none()
        if not existing_feature:
            feature = Feature(
                name=feature_data["name"], description=feature_data["description"]
            )
            db.add(feature)
            await db.flush()
            created_features[feature.name] = feature
            print(f"✅ Created feature: {feature.name}")
        else:
            created_features[existing_feature.name] = existing_feature
            print(f"ℹ️  Feature '{existing_feature.name}' already exists")

    # Create actions
    for action_data in actions_data:
        result = await db.execute(
            select(Action).where(Action.name == action_data["name"])
        )
        existing_action = result.scalar_one_or_none()
        if not existing_action:
            action = Action(
                name=action_data["name"], description=action_data["description"]
            )
            db.add(action)
            await db.flush()
            created_actions[action.name] = action
            print(f"✅ Created action: {action.name}")
        else:
            created_actions[existing_action.name] = existing_action
            print(f"ℹ️  Action '{existing_action.name}' already exists")

    return created_features, created_actions


async def seed_default_permissions(db, features, actions):
    """Create default permissions from features and actions"""
    print("Seeding permissions...")

    created_permissions = {}

    # Define permission combinations (feature:action)
    permission_combinations = [
        # User management
        ("users", "read"),
        ("users", "write"),
        ("users", "delete"),
        ("users", "admin"),
        ("users", "read:self"),
        ("users", "write:self"),
        ("users", "delete:self"),
        # Feature management
        ("features", "read"),
        ("features", "write"),
        ("features", "delete"),
        ("features", "admin"),
        # Action management
        ("actions", "read"),
        ("actions", "write"),
        ("actions", "delete"),
        ("actions", "admin"),
        # Role management
        ("roles", "read"),
        ("roles", "write"),
        ("roles", "delete"),
        ("roles", "admin"),
        # Permission management
        ("permissions", "read"),
        ("permissions", "write"),
        ("permissions", "delete"),
        ("permissions", "admin"),
        # Health check access
        ("health", "read"),
        ("health", "admin"),
        # Cache management
        ("cache", "read"),
        ("cache", "write"),
        ("cache", "delete"),
        ("cache", "admin"),
        # Master data management
        ("master_data", "read"),
        ("master_data", "write"),
        ("master_data", "delete"),
        ("master_data", "admin"),
    ]

    for feature_name, action_name in permission_combinations:
        if feature_name in features and action_name in actions:
            permission_code = f"{feature_name}:{action_name}"

            result = await db.execute(
                select(Permission).where(Permission.code == permission_code)
            )
            existing_permission = result.scalar_one_or_none()
            if not existing_permission:
                permission = Permission(
                    feature_id=features[feature_name].id,
                    action_id=actions[action_name].id,
                    code=permission_code,
                )
                db.add(permission)
                await db.flush()
                created_permissions[permission_code] = permission
                print(f"✅ Created permission: {permission_code}")
            else:
                created_permissions[permission_code] = existing_permission
                print(f"ℹ️  Permission '{permission_code}' already exists")

    return created_permissions


async def seed_default_roles(db, permissions):
    """Create default roles and assign permissions"""
    print("Seeding roles...")

    roles_data = [
        {
            "name": "Admin",
            "description": "System administrator with full access",
            "permissions": "all",  # Will get all permissions
        },
        {
            "name": "Manager",
            "description": "Manager with limited administrative access",
            "permissions": [
                "users:read",
                "users:write",
                "users:read:self",
                "users:write:self",
                "users:delete:self",
                "features:read",
                "actions:read",
                "roles:read",
                "permissions:read",
                "master_data:read",
                "master_data:write",
                "health:read",
            ],
        },
        {
            "name": "User",
            "description": "Basic user with minimal access",
            "permissions": [
                "users:read:self",
                "users:write:self",
                "users:delete:self",
                "master_data:read",
            ],
        },
        {
            "name": "Guest",
            "description": "Anonymous guest with limited session-based access",
            "permissions": ["master_data:read"],
        },
    ]

    created_roles = {}

    for role_data in roles_data:
        result = await db.execute(select(Role).where(Role.name == role_data["name"]))
        existing_role = result.scalar_one_or_none()
        if not existing_role:
            role = Role(name=role_data["name"], description=role_data["description"])
            db.add(role)
            await db.flush()
            created_roles[role.name] = role
            print(f"✅ Created role: {role.name}")
        else:
            created_roles[role_data["name"]] = existing_role
            print(f"ℹ️  Role '{existing_role.name}' already exists")

        # Assign permissions to role
        role = created_roles[role_data["name"]]

        # Clear existing permissions for this role
        await db.execute(
            delete(RolePermission).where(RolePermission.role_id == role.id)
        )

        if role_data["permissions"] == "all":
            # Assign all permissions to admin
            for permission in permissions.values():
                role_permission = RolePermission(
                    role_id=role.id, permission_id=permission.id
                )
                db.add(role_permission)
            print(f"✅ Assigned ALL permissions to role: {role.name}")
        else:
            # Assign specific permissions
            assigned_count = 0
            for permission_code in role_data["permissions"]:
                if permission_code in permissions:
                    role_permission = RolePermission(
                        role_id=role.id, permission_id=permissions[permission_code].id
                    )
                    db.add(role_permission)
                    assigned_count += 1
            print(f"✅ Assigned {assigned_count} permissions to role: {role.name}")

    return created_roles


async def seed_admin_user(db, roles):
    """Create admin user with authentication and role assignment"""
    print("Seeding admin user...")

    # Check if admin user already exists
    result = await db.execute(select(User).where(User.email == "admin@example.com"))
    existing_admin = result.scalar_one_or_none()
    if existing_admin:
        print("ℹ️  Admin user already exists, updating role assignment...")
        admin_user = existing_admin
    else:
        # Create admin user
        admin_user_id = str(uuid.uuid4())
        admin_user = User(
            id=admin_user_id,
            name="System Administrator",
            email="admin@example.com",
            phone="+1-555-0100",
            is_active=True,
        )
        db.add(admin_user)
        await db.flush()
        print(f"✅ Created admin user: {admin_user.email}")

        # Create authentication record for admin
        password_hash = token_service.get_password_hash("admin123")
        admin_auth = UserAuth.create_email_auth(
            user_id=admin_user.id, email=admin_user.email, password_hash=password_hash
        )
        db.add(admin_auth)
        print(f"✅ Created authentication record for admin user")

    # Assign Admin role
    if "Admin" in roles:
        result = await db.execute(
            select(UserRole).where(
                UserRole.user_id == admin_user.id, UserRole.role_id == roles["Admin"].id
            )
        )
        existing_user_role = result.scalar_one_or_none()

        if not existing_user_role:
            user_role = UserRole(user_id=admin_user.id, role_id=roles["Admin"].id)
            db.add(user_role)
            print(f"✅ Assigned Admin role to user: {admin_user.email}")
        else:
            print(f"ℹ️  Admin role already assigned to user: {admin_user.email}")

    return admin_user


async def seed_test_user(db, roles):
    """Create test user with basic role"""
    print("Seeding test user...")

    # Check if test user already exists
    result = await db.execute(select(User).where(User.email == "test@example.com"))
    existing_test = result.scalar_one_or_none()
    if existing_test:
        print("ℹ️  Test user already exists, skipping creation...")
        return existing_test

    # Create test user
    test_user_id = str(uuid.uuid4())
    test_user = User(
        id=test_user_id,
        name="Test User",
        email="test@example.com",
        phone="+1-555-0200",
        is_active=True,
    )
    db.add(test_user)
    await db.flush()
    print(f"✅ Created test user: {test_user.email}")

    # Create authentication record for test user
    password_hash = token_service.get_password_hash("test123")
    test_auth = UserAuth.create_email_auth(
        user_id=test_user.id, email=test_user.email, password_hash=password_hash
    )
    db.add(test_auth)
    print(f"✅ Created authentication record for test user")

    # Assign User role
    if "User" in roles:
        user_role = UserRole(user_id=test_user.id, role_id=roles["User"].id)
        db.add(user_role)
        print(f"✅ Assigned User role to: {test_user.email}")

    return test_user


async def seed_default_data():
    """Seed the database with default data using async operations"""
    print("Seeding default data...")

    # Use async engine and session for seeding
    async_engine = create_async_engine(
        settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
        echo=False,
    )

    async_session = sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as db:
        try:
            # Seed features and actions
            features, actions = await seed_default_features_and_actions(db)

            # Seed permissions
            permissions = await seed_default_permissions(db, features, actions)

            # Seed roles and assign permissions
            roles = await seed_default_roles(db, permissions)

            # Seed admin user
            admin_user = await seed_admin_user(db, roles)

            # Seed test user
            test_user = await seed_test_user(db, roles)

            # Commit all changes
            await db.commit()

            print("\n🎉 Seed data summary:")
            print(f"✅ Features: {len(features)}")
            print(f"✅ Actions: {len(actions)}")
            print(f"✅ Permissions: {len(permissions)}")
            print(f"✅ Roles: {len(roles)}")
            print(f"✅ Admin user: {admin_user.email} (password: admin123)")
            print(f"✅ Test user: {test_user.email} (password: test123)")

        except Exception as e:
            print(f"❌ Error seeding data: {str(e)}")
            await db.rollback()
            raise


async def main():
    """Main function to initialize the database"""
    try:
        print("🚀 Starting database initialization...")

        # Create tables first
        # create_tables()

        # Seed default data
        await seed_default_data()

        print("✅ Database initialization completed successfully!")
        print("\n📋 Default login credentials:")
        print("   Admin: admin@example.com / admin123")
        print("   Test:  test@example.com / test123")

    except Exception as e:
        print(f"❌ Database initialization failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
