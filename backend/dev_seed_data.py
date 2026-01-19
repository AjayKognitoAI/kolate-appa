#!/usr/bin/env python3

import asyncio
import sys
import os
import uuid
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config.settings import settings
# Import all models to ensure they are registered with SQLAlchemy
from app import models  # noqa: F401

# Core models that should exist in both branches
from app.models.user import User
from app.models.user_auth import UserAuth, AuthType  # noqa: F401  # AuthType used by factory
from app.models.role import Role, UserRole
from app.models.homeowner import Homeowner
from app.models.service_provider import ServiceProvider
from app.models.address import Address
from app.models.gig_request import (
    GigRequest, GigStatus, GigUrgency, GigVisibility,
)
from app.models.bid import Bid, BidStatus
from app.models.payment import Payment, PaymentStatus
from app.services.token_service import token_service
from app.schemas.gig_request import AddressSnapshot, CategorySnapshot

# ---- Optional models (exist in only one side of the merge) ----
# Service taxonomy branch
try:
    from app.models.service_category import ServiceCategory  # type: ignore
    from app.models.service_subcategory import ServiceSubCategory  # type: ignore
    from app.models.tag import Tag  # type: ignore
    from app.models.service_category_locale import ServiceCategoryLocale  # type: ignore
    from app.models.service_subcategory_locale import ServiceSubCategoryLocale  # type: ignore
    from app.models.tag_locale import TagLocale  # type: ignore
    HAS_SERVICE_TAXONOMY = True
except Exception:
    ServiceCategory = ServiceSubCategory = Tag = None  # type: ignore
    ServiceCategoryLocale = ServiceSubCategoryLocale = TagLocale = None  # type: ignore
    HAS_SERVICE_TAXONOMY = False

# Master data branch
try:
    from app.models.master_data import MasterData, MasterDataLocale  # type: ignore
    HAS_MASTER_DATA = True
except Exception:
    MasterData = MasterDataLocale = None  # type: ignore
    HAS_MASTER_DATA = False


# -------------------------
# Service taxonomy seeders
# -------------------------
async def seed_service_categories(db: AsyncSession) -> List:
    if not HAS_SERVICE_TAXONOMY:
        print("ℹ️  Service taxonomy models not present; skipping categories.")
        return []

    print("Seeding service categories...")
    categories_data = [
        {"code": "PLUMBING", "name": "Plumbing", "icon": "plumbing-icon", "description": "Plumbing repair, installation, and maintenance services", "is_active": True, "sort_order": 1},
        {"code": "ELECTRICAL", "name": "Electrical", "icon": "electrical-icon", "description": "Electrical work, wiring, and installation services", "is_active": True, "sort_order": 2},
        {"code": "CLEANING", "name": "Cleaning", "icon": "cleaning-icon", "description": "House cleaning and maintenance services", "is_active": True, "sort_order": 3},
        {"code": "LANDSCAPING", "name": "Landscaping", "icon": "landscaping-icon", "description": "Lawn care, gardening, and outdoor maintenance", "is_active": True, "sort_order": 4},
        {"code": "PAINTING", "name": "Painting", "icon": "painting-icon", "description": "Interior and exterior painting services", "is_active": True, "sort_order": 5},
        {"code": "HVAC", "name": "HVAC", "icon": "hvac-icon", "description": "Heating, ventilation, and air conditioning services", "is_active": True, "sort_order": 6},
        {"code": "CARPENTRY", "name": "Carpentry", "icon": "carpentry-icon", "description": "Woodworking, furniture repair, and construction", "is_active": True, "sort_order": 7},
        {"code": "ROOFING", "name": "Roofing", "icon": "roofing-icon", "description": "Roof repair, installation, and maintenance", "is_active": True, "sort_order": 8},
    ]
    created = []
    for data in categories_data:
        result = await db.execute(select(ServiceCategory).where(ServiceCategory.code == data["code"]))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"ℹ️  Category '{data['code']}' already exists")
            created.append(existing)
            continue
        obj = ServiceCategory(**data)
        db.add(obj)
        await db.flush()
        created.append(obj)
        print(f"✅ Created service category: {obj.code} - {obj.name}")
    return created


async def seed_service_subcategories(db: AsyncSession, categories: List) -> List:
    if not HAS_SERVICE_TAXONOMY:
        print("ℹ️  Service taxonomy models not present; skipping subcategories.")
        return []

    print("Seeding service subcategories...")
    category_map = {c.code: c for c in categories}
    subcategories_data = [
        {"category_code": "PLUMBING", "code": "PLUMB_REPAIR", "name": "Plumbing Repair", "description": "General plumbing repairs and fixes", "sort_order": 1},
        {"category_code": "PLUMBING", "code": "PLUMB_INSTALL", "name": "Plumbing Installation", "description": "New plumbing installation services", "sort_order": 2},
        {"category_code": "PLUMBING", "code": "DRAIN_CLEAN", "name": "Drain Cleaning", "description": "Drain cleaning and unclogging services", "sort_order": 3},
        {"category_code": "ELECTRICAL", "code": "ELECT_REPAIR", "name": "Electrical Repair", "description": "Electrical troubleshooting and repairs", "sort_order": 1},
        {"category_code": "ELECTRICAL", "code": "ELECT_INSTALL", "name": "Electrical Installation", "description": "Electrical installations and wiring", "sort_order": 2},
        {"category_code": "ELECTRICAL", "code": "LIGHTING", "name": "Lighting Services", "description": "Light fixture installation and repair", "sort_order": 3},
        {"category_code": "CLEANING", "code": "HOUSE_CLEAN", "name": "House Cleaning", "description": "Regular house cleaning services", "sort_order": 1},
        {"category_code": "CLEANING", "code": "DEEP_CLEAN", "name": "Deep Cleaning", "description": "Thorough deep cleaning services", "sort_order": 2},
        {"category_code": "CLEANING", "code": "CARPET_CLEAN", "name": "Carpet Cleaning", "description": "Carpet and upholstery cleaning", "sort_order": 3},
        {"category_code": "LANDSCAPING", "code": "LAWN_CARE", "name": "Lawn Care", "description": "Grass cutting and lawn maintenance", "sort_order": 1},
        {"category_code": "LANDSCAPING", "code": "GARDEN_MAINT", "name": "Garden Maintenance", "description": "Garden upkeep and plant care", "sort_order": 2},
        {"category_code": "LANDSCAPING", "code": "TREE_SERVICE", "name": "Tree Services", "description": "Tree trimming and removal", "sort_order": 3},
        {"category_code": "PAINTING", "code": "INTERIOR_PAINT", "name": "Interior Painting", "description": "Indoor painting services", "sort_order": 1},
        {"category_code": "PAINTING", "code": "EXTERIOR_PAINT", "name": "Exterior Painting", "description": "Outdoor painting services", "sort_order": 2},
        {"category_code": "HVAC", "code": "AC_REPAIR", "name": "AC Repair", "description": "Air conditioning repair and maintenance", "sort_order": 1},
        {"category_code": "HVAC", "code": "HEATING_REPAIR", "name": "Heating Repair", "description": "Heating system repair and maintenance", "sort_order": 2},
        {"category_code": "CARPENTRY", "code": "FURNITURE_REPAIR", "name": "Furniture Repair", "description": "Furniture restoration and repair", "sort_order": 1},
        {"category_code": "CARPENTRY", "code": "CUSTOM_WORK", "name": "Custom Carpentry", "description": "Custom woodworking projects", "sort_order": 2},
        {"category_code": "ROOFING", "code": "ROOF_REPAIR", "name": "Roof Repair", "description": "Roof leak repair and maintenance", "sort_order": 1},
        {"category_code": "ROOFING", "code": "ROOF_INSTALL", "name": "Roof Installation", "description": "New roof installation services", "sort_order": 2},
    ]
    created = []
    for data in subcategories_data:
        category = category_map.get(data["category_code"])
        if not category:
            print(f"⚠️  Category '{data['category_code']}' not found for subcategory '{data['code']}'")
            continue
        result = await db.execute(select(ServiceSubCategory).where(ServiceSubCategory.code == data["code"]))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"ℹ️  Subcategory '{data['code']}' already exists")
            created.append(existing)
            continue
        obj = ServiceSubCategory(
            category_id=category.id,
            code=data["code"],
            name=data["name"],
            description=data["description"],
            is_active=True,
        )
        db.add(obj)
        await db.flush()
        created.append(obj)
        print(f"✅ Created service subcategory: {obj.code} - {obj.name}")
    return created


async def seed_tags(db: AsyncSession) -> List:
    if not HAS_SERVICE_TAXONOMY:
        print("ℹ️  Service taxonomy models not present; skipping tags.")
        return []

    print("Seeding tags...")
    tags_data = [
        {"name": "Emergency", "slug": "emergency", "description": "Emergency services available"},
        {"name": "Licensed", "slug": "licensed", "description": "Licensed and certified professionals"},
        {"name": "Insured", "slug": "insured", "description": "Insured service providers"},
        {"name": "24/7", "slug": "24-7", "description": "24/7 availability"},
        {"name": "Eco-Friendly", "slug": "eco-friendly", "description": "Environmentally friendly services"},
        {"name": "Budget-Friendly", "slug": "budget-friendly", "description": "Affordable pricing options"},
        {"name": "Same-Day", "slug": "same-day", "description": "Same day service available"},
        {"name": "Warranty", "slug": "warranty", "description": "Work comes with warranty"},
        {"name": "Free-Estimate", "slug": "free-estimate", "description": "Free estimates provided"},
        {"name": "Senior-Discount", "slug": "senior-discount", "description": "Senior citizen discounts available"},
        {"name": "Commercial", "slug": "commercial", "description": "Commercial services available"},
        {"name": "Residential", "slug": "residential", "description": "Residential services"},
        {"name": "High-Quality", "slug": "high-quality", "description": "Premium quality services"},
        {"name": "Fast-Service", "slug": "fast-service", "description": "Quick turnaround time"},
        {"name": "Experienced", "slug": "experienced", "description": "Years of experience in the field"},
    ]
    created = []
    for data in tags_data:
        result = await db.execute(select(Tag).where(Tag.slug == data["slug"]))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"ℹ️  Tag '{data['slug']}' already exists")
            created.append(existing)
            continue
        obj = Tag(**data)
        db.add(obj)
        await db.flush()
        created.append(obj)
        print(f"✅ Created tag: {obj.name} ({obj.slug})")
    return created


async def seed_service_category_locales(db: AsyncSession, categories: List) -> List:
    if not (HAS_SERVICE_TAXONOMY and categories):
        print("ℹ️  Category locales skipped (missing models or categories).")
        return []
    print("Seeding service category locales...")
    locales_data = [
        {"locale": "en_US", "suffix": ""},
        {"locale": "es_ES", "suffix": " (ES)"},
        {"locale": "fr_FR", "suffix": " (FR)"},
    ]
    created = []
    for category in categories:
        for loc in locales_data:
            result = await db.execute(
                select(ServiceCategoryLocale).where(
                    ServiceCategoryLocale.category_id == category.id,
                    ServiceCategoryLocale.locale == loc["locale"],
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                print(f"ℹ️  Locale '{loc['locale']}' for category '{category.code}' already exists")
                created.append(existing)
                continue
            display_name = category.name + loc["suffix"]
            description = category.description + loc["suffix"] if category.description else None
            entry = ServiceCategoryLocale(
                category_id=category.id,
                locale=loc["locale"],
                display_name=display_name,
                description=description,
            )
            db.add(entry)
            await db.flush()
            created.append(entry)
            print(f"✅ Created locale '{loc['locale']}' for category '{category.code}'")
    return created


async def seed_service_subcategory_locales(db: AsyncSession, subcategories: List) -> List:
    if not (HAS_SERVICE_TAXONOMY and subcategories):
        print("ℹ️  Subcategory locales skipped (missing models or subcategories).")
        return []
    print("Seeding service subcategory locales...")
    locales_data = [
        {"locale": "en_US", "suffix": ""},
        {"locale": "es_ES", "suffix": " (ES)"},
        {"locale": "fr_FR", "suffix": " (FR)"},
    ]
    created = []
    for subcategory in subcategories:
        for loc in locales_data:
            result = await db.execute(
                select(ServiceSubCategoryLocale).where(
                    ServiceSubCategoryLocale.subcategory_id == subcategory.id,
                    ServiceSubCategoryLocale.locale == loc["locale"],
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                print(f"ℹ️  Locale '{loc['locale']}' for subcategory '{subcategory.code}' already exists")
                created.append(existing)
                continue
            display_name = subcategory.name + loc["suffix"]
            description = subcategory.description + loc["suffix"] if subcategory.description else None
            entry = ServiceSubCategoryLocale(
                subcategory_id=subcategory.id,
                locale=loc["locale"],
                display_name=display_name,
                description=description,
            )
            db.add(entry)
            await db.flush()
            created.append(entry)
            print(f"✅ Created locale '{loc['locale']}' for subcategory '{subcategory.code}'")
    return created


async def seed_tag_locales(db: AsyncSession, tags: List) -> List:
    if not (HAS_SERVICE_TAXONOMY and tags):
        print("ℹ️  Tag locales skipped (missing models or tags).")
        return []
    print("Seeding tag locales...")
    locales_data = [
        {"locale": "en_US", "suffix": ""},
        {"locale": "es_ES", "suffix": " (ES)"},
        {"locale": "fr_FR", "suffix": " (FR)"},
    ]
    created = []
    for tag in tags:
        for loc in locales_data:
            result = await db.execute(
                select(TagLocale).where(
                    TagLocale.tag_id == tag.id,
                    TagLocale.locale == loc["locale"],
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                print(f"ℹ️  Locale '{loc['locale']}' for tag '{tag.slug}' already exists")
                created.append(existing)
                continue
            display_name = tag.name + loc["suffix"]
            description = tag.description + loc["suffix"] if tag.description else None
            entry = TagLocale(
                tag_id=tag.id,
                locale=loc["locale"],
                display_name=display_name,
                description=description,
            )
            db.add(entry)
            await db.flush()
            created.append(entry)
            print(f"✅ Created locale '{loc['locale']}' for tag '{tag.slug}'")
    return created


# -------------------------
# Master data seeders
# -------------------------
async def seed_master_data(db: AsyncSession) -> List:
    if not HAS_MASTER_DATA:
        print("ℹ️  MasterData models not present; skipping master data.")
        return []

    print("Seeding master data...")

    gender_data = [
        {"scope": "gender", "code": "male", "display_name": "Male", "description": "Male gender", "sort_order": 1},
        {"scope": "gender", "code": "female", "display_name": "Female", "description": "Female gender", "sort_order": 2},
        {"scope": "gender", "code": "non_binary", "display_name": "Non-Binary", "description": "Non-binary gender identity", "sort_order": 3},
        {"scope": "gender", "code": "prefer_not_to_say", "display_name": "Prefer Not to Say", "description": "Prefer not to disclose gender", "sort_order": 4},
    ]

    country_data = [
        {"scope": "country", "code": "US", "display_name": "United States", "description": "United States of America", "sort_order": 1},
        {"scope": "country", "code": "CA", "display_name": "Canada", "description": "Canada", "sort_order": 2},
        {"scope": "country", "code": "MX", "display_name": "Mexico", "description": "United Mexican States", "sort_order": 3},
        {"scope": "country", "code": "UK", "display_name": "United Kingdom", "description": "United Kingdom of Great Britain and Northern Ireland", "sort_order": 4},
        {"scope": "country", "code": "DE", "display_name": "Germany", "description": "Federal Republic of Germany", "sort_order": 5},
        {"scope": "country", "code": "FR", "display_name": "France", "description": "French Republic", "sort_order": 6},
    ]

    state_data = [
        {"scope": "state", "code": "CA", "display_name": "California", "parent_scope": "country", "parent_code": "US", "description": "State of California", "sort_order": 1},
        {"scope": "state", "code": "NY", "display_name": "New York", "parent_scope": "country", "parent_code": "US", "description": "State of New York", "sort_order": 2},
        {"scope": "state", "code": "TX", "display_name": "Texas", "parent_scope": "country", "parent_code": "US", "description": "State of Texas", "sort_order": 3},
        {"scope": "state", "code": "FL", "display_name": "Florida", "parent_scope": "country", "parent_code": "US", "description": "State of Florida", "sort_order": 4},
        {"scope": "state", "code": "IL", "display_name": "Illinois", "parent_scope": "country", "parent_code": "US", "description": "Commonwealth of Pennsylvania", "sort_order": 5},
        {"scope": "state", "code": "PA", "display_name": "Pennsylvania", "parent_scope": "country", "parent_code": "US", "description": "Commonwealth of Pennsylvania", "sort_order": 6},
        {"scope": "state", "code": "AZ", "display_name": "Arizona", "parent_scope": "country", "parent_code": "US", "description": "State of Arizona", "sort_order": 7},
        {"scope": "state", "code": "ON", "display_name": "Ontario", "parent_scope": "country", "parent_code": "CA", "description": "Province of Ontario", "sort_order": 8},
        {"scope": "state", "code": "QC", "display_name": "Quebec", "parent_scope": "country", "parent_code": "CA", "description": "Province of Quebec", "sort_order": 9},
        {"scope": "state", "code": "BC", "display_name": "British Columbia", "parent_scope": "country", "parent_code": "CA", "description": "Province of British Columbia", "sort_order": 10},
        {"scope": "state", "code": "CMX", "display_name": "Mexico City", "parent_scope": "country", "parent_code": "MX", "description": "Mexico City (Ciudad de México)", "sort_order": 11},
        {"scope": "state", "code": "JAL", "display_name": "Jalisco", "parent_scope": "country", "parent_code": "MX", "description": "State of Jalisco", "sort_order": 12},
    ]

    all_items = gender_data + country_data + state_data
    created = []
    for item in all_items:
        result = await db.execute(
            select(MasterData).where(MasterData.scope == item["scope"], MasterData.code == item["code"])
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"ℹ️  Master data '{item['scope']}:{item['code']}' already exists")
            created.append(existing)
            continue
        obj = MasterData(**item)
        db.add(obj)
        await db.flush()
        created.append(obj)
        print(f"✅ Created master data: {obj.scope}:{obj.code} - {obj.display_name}")
    return created


async def seed_master_data_locales(db: AsyncSession, master_data_list: List) -> List:
    if not (HAS_MASTER_DATA and master_data_list):
        print("ℹ️  Master data locales skipped (missing models or data).")
        return []

    print("Seeding master data locales...")
    locales_data = [
        {"locale": "en_US", "suffix": ""},
        {"locale": "es_ES", "suffix": " (ES)"},
        {"locale": "fr_FR", "suffix": " (FR)"},
    ]

    localized_translations = {
        ("gender", "male"): {
            "es_ES": {"display_name": "Masculino", "description": "Género masculino"},
            "fr_FR": {"display_name": "Masculin", "description": "Genre masculin"},
        },
        ("gender", "female"): {
            "es_ES": {"display_name": "Femenino", "description": "Género femenino"},
            "fr_FR": {"display_name": "Féminin", "description": "Genre féminin"},
        },
        ("gender", "non_binary"): {
            "es_ES": {"display_name": "No Binario", "description": "Identidad de género no binaria"},
            "fr_FR": {"display_name": "Non-Binaire", "description": "Identité de genre non binaire"},
        },
        ("gender", "prefer_not_to_say"): {
            "es_ES": {"display_name": "Prefiero no decir", "description": "Prefiero no revelar el género"},
            "fr_FR": {"display_name": "Préfère ne pas dire", "description": "Préfère ne pas révéler le genre"},
        },
        ("country", "US"): {
            "es_ES": {"display_name": "Estados Unidos", "description": "Estados Unidos de América"},
            "fr_FR": {"display_name": "États-Unis", "description": "États-Unis d'Amérique"},
        },
        ("country", "CA"): {
            "es_ES": {"display_name": "Canadá", "description": "Canadá"},
            "fr_FR": {"display_name": "Canada", "description": "Canada"},
        },
        ("country", "MX"): {
            "es_ES": {"display_name": "México", "description": "Estados Unidos Mexicanos"},
            "fr_FR": {"display_name": "Mexique", "description": "États-Unis du Mexique"},
        },
        ("country", "UK"): {
            "es_ES": {"display_name": "Reino Unido", "description": "Reino Unido de Gran Bretaña e Irlanda del Norte"},
            "fr_FR": {"display_name": "Royaume-Uni", "description": "Royaume-Uni de Grande-Bretagne et d'Irlande du Nord"},
        },
        ("country", "DE"): {
            "es_ES": {"display_name": "Alemania", "description": "República Federal de Alemania"},
            "fr_FR": {"display_name": "Allemagne", "description": "République fédérale d'Allemagne"},
        },
        ("country", "FR"): {
            "es_ES": {"display_name": "Francia", "description": "República Francesa"},
            "fr_FR": {"display_name": "France", "description": "République française"},
        },
    }

    created = []
    for obj in master_data_list:
        for loc in locales_data:
            result = await db.execute(
                select(MasterDataLocale).where(
                    MasterDataLocale.master_id == obj.id,
                    MasterDataLocale.locale == loc["locale"],
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                print(f"ℹ️  Locale '{loc['locale']}' for '{obj.scope}:{obj.code}' already exists")
                created.append(existing)
                continue

            key = (obj.scope, obj.code)
            if key in localized_translations and loc["locale"] in localized_translations[key]:
                trans = localized_translations[key][loc["locale"]]
                display_name = trans["display_name"]
                description = trans["description"]
            else:
                display_name = obj.display_name + loc["suffix"]
                description = (obj.description + loc["suffix"]) if obj.description else None

            entry = MasterDataLocale(
                master_id=obj.id,
                locale=loc["locale"],
                display_name=display_name,
                description=description,
            )
            db.add(entry)
            await db.flush()
            created.append(entry)
            print(f"✅ Created locale '{loc['locale']}' for '{obj.scope}:{obj.code}'")
    return created


# -------------------------
# Dummy data seeders
# -------------------------
async def seed_dummy_homeowners(db: AsyncSession, homeowner_role: Optional[Role]) -> List[Homeowner]:
    print("Seeding dummy homeowners...")
    homeowners_data = [
        {"name": "John Smith", "email": "john.homeowner@example.com", "phone": "+1-555-0301", "password": "homeowner123"},
        {"name": "Sarah Johnson", "email": "sarah.homeowner@example.com", "phone": "+1-555-0302", "password": "homeowner123"},
        {"name": "Michael Davis", "email": "michael.homeowner@example.com", "phone": "+1-555-0303", "password": "homeowner123"},
        {"name": "Emily Wilson", "email": "emily.homeowner@example.com", "phone": "+1-555-0304", "password": "homeowner123"},
        {"name": "David Brown", "email": "david.homeowner@example.com", "phone": "+1-555-0305", "password": "homeowner123"},
    ]
    created: List[Homeowner] = []
    for h in homeowners_data:
        result = await db.execute(select(User).where(User.email == h["email"]))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            print(f"ℹ️  Homeowner user '{h['email']}' already exists")
            continue

        user = User(
            id=str(uuid.uuid4()),
            name=h["name"],
            email=h["email"],
            phone=h["phone"],
            is_active=True,
        )
        db.add(user)
        await db.flush()

        password_hash = token_service.get_password_hash(h["password"])
        user_auth = UserAuth.create_email_auth(user_id=user.id, email=user.email, password_hash=password_hash)
        db.add(user_auth)

        homeowner = Homeowner(user_id=user.id)
        db.add(homeowner)
        await db.flush()

        if homeowner_role:
            db.add(UserRole(user_id=user.id, role_id=homeowner_role.id))

        created.append(homeowner)
        print(f"✅ Created homeowner: {user.name} ({user.email})")
    return created


async def seed_dummy_service_providers(db: AsyncSession, service_provider_role: Optional[Role]) -> List[ServiceProvider]:
    print("Seeding dummy service providers...")
    providers_data = [
        {"name": "Mike's Plumbing Services", "email": "mike.plumber@example.com", "phone": "+1-555-0401", "password": "provider123", "business_name": "Mike's Plumbing Co.", "license_number": "PL-12345", "verification_status": "verified", "certifications": "Licensed Plumber, Emergency Response Certified"},
        {"name": "Lisa's Electrical Works", "email": "lisa.electrician@example.com", "phone": "+1-555-0402", "password": "provider123", "business_name": "Lisa's Electrical Solutions", "license_number": "EL-67890", "verification_status": "verified", "certifications": "Master Electrician, Safety Certified"},
        {"name": "Tom's Handyman Services", "email": "tom.handyman@example.com", "phone": "+1-555-0403", "password": "provider123", "business_name": "Tom's Fix-It-All", "license_number": "HM-11111", "verification_status": "pending", "certifications": "General Contractor, Home Repair Specialist"},
        {"name": "Anna's Cleaning Services", "email": "anna.cleaner@example.com", "phone": "+1-555-0404", "password": "provider123", "business_name": "Anna's Spotless Cleaning", "license_number": "CL-22222", "verification_status": "verified", "certifications": "Eco-Friendly Cleaning, Carpet Cleaning Certified"},
        {"name": "Robert's Landscaping", "email": "robert.landscaper@example.com", "phone": "+1-555-0405", "password": "provider123", "business_name": "Robert's Green Thumb Landscaping", "license_number": "LS-33333", "verification_status": "verified", "certifications": "Landscape Design, Tree Care Specialist"},
        {"name": "Jennifer's Interior Design", "email": "jen.designer@example.com", "phone": "+1-555-0406", "password": "provider123", "business_name": "Jennifer's Interior Concepts", "license_number": "ID-44444", "verification_status": "pending", "certifications": "Interior Design Degree, Color Theory Certified"},
    ]
    created: List[ServiceProvider] = []
    for p in providers_data:
        result = await db.execute(select(User).where(User.email == p["email"]))
        existing_user = result.scalar_one_or_none()
        if existing_user:
            print(f"ℹ️  Service provider user '{p['email']}' already exists")
            continue

        user = User(
            id=str(uuid.uuid4()),
            name=p["name"],
            email=p["email"],
            phone=p["phone"],
            is_active=True,
        )
        db.add(user)
        await db.flush()

        password_hash = token_service.get_password_hash(p["password"])
        user_auth = UserAuth.create_email_auth(user_id=user.id, email=user.email, password_hash=password_hash)
        db.add(user_auth)

        service_provider = ServiceProvider(
            user_id=user.id,
            business_name=p["business_name"],
            license_number=p["license_number"],
            verification_status=p["verification_status"],
        )
        db.add(service_provider)
        await db.flush()

        if service_provider_role:
            db.add(UserRole(user_id=user.id, role_id=service_provider_role.id))

        created.append(service_provider)
        print(f"✅ Created service provider: {user.name} ({user.email}) - {p['business_name']}")
    return created


async def seed_dummy_addresses(db: AsyncSession, homeowners: List[Homeowner]) -> List[Address]:
    print("Seeding dummy addresses...")
    addresses_data = [
        {"line1": "123 Main Street", "line2": "Apt 2B", "city": "New York", "state": "NY", "postal_code": "10001", "country": "USA", "latitude": 40.7128, "longitude": -74.0060},
        {"line1": "456 Oak Avenue", "line2": "", "city": "Los Angeles", "state": "CA", "postal_code": "90210", "country": "USA", "latitude": 34.0522, "longitude": -118.2437},
        {"line1": "789 Pine Road", "line2": "Unit 5", "city": "Chicago", "state": "IL", "postal_code": "60601", "country": "USA", "latitude": 41.8781, "longitude": -87.6298},
        {"line1": "321 Elm Street", "line2": "", "city": "Houston", "state": "TX", "postal_code": "77001", "country": "USA", "latitude": 29.7604, "longitude": -95.3698},
        {"line1": "654 Maple Drive", "line2": "Suite 10", "city": "Phoenix", "state": "AZ", "postal_code": "85001", "country": "USA", "latitude": 33.4484, "longitude": -112.0740},
        {"line1": "987 Cedar Lane", "line2": "", "city": "Philadelphia", "state": "PA", "postal_code": "19101", "country": "USA", "latitude": 39.9526, "longitude": -75.1652},
        {"line1": "135 Birch Court", "line2": "Floor 3", "city": "San Antonio", "state": "TX", "postal_code": "78201", "country": "USA", "latitude": 29.4241, "longitude": -98.4936},
    ]
    created: List[Address] = []
    for i, data in enumerate(addresses_data):
        if i >= len(homeowners):
            break
        homeowner = homeowners[i]
        result = await db.execute(
            select(Address).where(Address.homeowner_id == homeowner.id, Address.line1 == data["line1"])
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"ℹ️  Address '{data['line1']}' already exists for homeowner {homeowner.id}")
            created.append(existing)
            continue
        addr = Address(
            homeowner_id=homeowner.id,
            line1=data["line1"],
            line2=data["line2"] or None,
            city=data["city"],
            state=data["state"],
            postal_code=data["postal_code"],
            country=data["country"],
            latitude=data["latitude"],
            longitude=data["longitude"],
        )
        db.add(addr)
        await db.flush()
        created.append(addr)
        print(f"✅ Created address: {addr.line1}, {addr.city}, {addr.state} for homeowner {homeowner.id}")
    return created


async def seed_dummy_gig_requests(
    db: AsyncSession,
    homeowners: List[Homeowner],
    addresses: List[Address],
    categories: Optional[List] = None,
    subcategories: Optional[List] = None,
) -> List[GigRequest]:
    print("Seeding dummy gig requests...")

    categories = categories or []
    subcategories = subcategories or []
    category_map = {c.code: c for c in categories if hasattr(c, "code")}
    subcategory_map = {s.code: s for s in subcategories if hasattr(s, "code")}

    gigs_data = [
        {"title": "Urgent Kitchen Sink Repair", "description": "Need urgent plumbing repair in kitchen sink. Water is leaking and needs immediate attention. Please bring necessary tools and parts.", "urgency": GigUrgency.HIGH, "budget": 250.0, "visibility": GigVisibility.OPEN_BIDDING, "status": GigStatus.POSTED, "category_code": "PLUMBING", "subcategory_code": "PLUMB_REPAIR"},
        {"title": "Ceiling Fan Installation", "description": "Looking for electrical work to install ceiling fan in living room. Already purchased the fan, just need installation service.", "urgency": GigUrgency.MEDIUM, "budget": 150.0, "visibility": GigVisibility.OPEN_BIDDING, "status": GigStatus.IN_PROGRESS, "category_code": "ELECTRICAL", "subcategory_code": "LIGHTING"},
        {"title": "Deep House Cleaning Service", "description": "House cleaning service needed for 3-bedroom house. Deep cleaning required including bathrooms and kitchen. Eco-friendly products preferred.", "urgency": GigUrgency.LOW, "budget": 200.0, "visibility": GigVisibility.OPEN_BIDDING, "status": GigStatus.COMPLETED, "category_code": "CLEANING", "subcategory_code": "DEEP_CLEAN"},
        {"title": "Lawn and Garden Maintenance", "description": "Landscape maintenance for front and backyard. Need grass cutting, hedge trimming, and basic garden maintenance.", "urgency": GigUrgency.MEDIUM, "budget": 300.0, "visibility": GigVisibility.DIRECT_REQUEST, "status": GigStatus.POSTED, "category_code": "LANDSCAPING", "subcategory_code": "LAWN_CARE"},
        {"title": "Master Bedroom Interior Painting", "description": "Interior painting for master bedroom. Need professional painter to paint walls and ceiling. Paint already purchased.", "urgency": GigUrgency.LOW, "budget": 400.0, "visibility": GigVisibility.OPEN_BIDDING, "status": GigStatus.IN_PROGRESS, "category_code": "PAINTING", "subcategory_code": "INTERIOR_PAINT"},
        {"title": "HVAC Annual Maintenance", "description": "HVAC system maintenance and inspection. Annual service required for heating and cooling system.", "urgency": GigUrgency.MEDIUM, "budget": 180.0, "visibility": GigVisibility.OPEN_BIDDING, "status": GigStatus.CANCELLED, "category_code": "HVAC", "subcategory_code": "AC_REPAIR"},
    ]

    created: List[GigRequest] = []
    for i, g in enumerate(gigs_data):
        if i >= len(homeowners) or i >= len(addresses):
            break
        homeowner = homeowners[i]
        address = addresses[i]

        category = category_map.get(g["category_code"])
        subcategory = subcategory_map.get(g["subcategory_code"]) if category else None

        # Avoid duplicates
        result = await db.execute(
            select(GigRequest).where(
                GigRequest.homeowner_id == homeowner.id,
                GigRequest.description.ilike(f"%{g['description'][:50]}%"),
            )
        )
        if result.scalar_one_or_none():
            print(f"ℹ️  Similar gig request already exists for homeowner {homeowner.id}")
            continue

        address_snapshot = AddressSnapshot(
            line1=address.line1,
            line2=address.line2,
            city=address.city,
            state=address.state,
            postal_code=address.postal_code,
            country=address.country,
            latitude=address.latitude,
            longitude=address.longitude,
        ).model_dump()

        # If we don't have service taxonomy models, keep category snapshot minimal or None
        category_snapshot = None
        subcategory_snapshot = None
        category_id = None
        subcategory_id = None

        if category:
            category_snapshot = CategorySnapshot(
                id=category.id,
                name=getattr(category, "name", None),
                description=getattr(category, "description", None),
            ).model_dump()
            category_id = category.id

        if subcategory:
            subcategory_snapshot = {
                "id": subcategory.id,
                "code": subcategory.code,
                "name": subcategory.name,
                "description": subcategory.description,
            }
            subcategory_id = subcategory.id

        gig = GigRequest(
            homeowner_id=homeowner.id,
            category_id=category_id,
            subcategory_id=subcategory_id,
            address_id=address.id,
            title=g["title"],
            description=g["description"],
            urgency=g["urgency"],
            budget=g["budget"],
            visibility=g["visibility"],
            status=g["status"],
            address_snapshot=address_snapshot,
            category_snapshot=category_snapshot,
            subcategory_snapshot=subcategory_snapshot,
        )
        db.add(gig)
        await db.flush()
        created.append(gig)
        print(f"✅ Created gig request: {gig.title} for homeowner {homeowner.id}")
    return created


async def seed_dummy_bids(
    db: AsyncSession,
    gig_requests: List[GigRequest],
    service_providers: List[ServiceProvider],
) -> List[Bid]:
    """Seed bids for gig requests based on their status."""
    print("Seeding dummy bids...")

    if not gig_requests or not service_providers:
        print("ℹ️  No gig requests or service providers to create bids for")
        return []

    created: List[Bid] = []

    # Bids data: each tuple is (gig_index, provider_index, bid_amount, description, estimated_duration, status)
    bids_data = [
        # Gig 0 (POSTED - Plumbing): Multiple pending bids
        (0, 0, 230.0, "I can fix your kitchen sink quickly with quality parts. Licensed plumber with 10+ years experience.", "2 hours", BidStatus.PENDING),
        (0, 2, 250.0, "Same-day service available. All tools and parts included in the price.", "3 hours", BidStatus.PENDING),

        # Gig 1 (IN_PROGRESS - Electrical): One accepted bid
        (1, 1, 145.0, "Professional ceiling fan installation. I've installed hundreds of ceiling fans safely.", "1.5 hours", BidStatus.ACCEPTED),
        (1, 2, 160.0, "Can do it today. Includes warranty on installation work.", "2 hours", BidStatus.REJECTED),

        # Gig 2 (COMPLETED - Cleaning): One accepted bid (completed work)
        (2, 3, 195.0, "Eco-friendly deep cleaning with premium products. Satisfaction guaranteed!", "4 hours", BidStatus.ACCEPTED),
        (2, 2, 210.0, "Professional cleaning service with references available.", "5 hours", BidStatus.REJECTED),

        # Gig 3 (POSTED - Landscaping/DIRECT_REQUEST): No bids needed for direct request

        # Gig 4 (IN_PROGRESS - Painting): One accepted bid
        (4, 2, 380.0, "Professional painter with portfolio. Will prep and paint to perfection.", "2 days", BidStatus.ACCEPTED),
        (4, 5, 420.0, "Interior design expertise included. Premium paint application.", "3 days", BidStatus.REJECTED),

        # Gig 5 (CANCELLED - HVAC): Had pending bids before cancellation
        (5, 0, 175.0, "Annual HVAC maintenance specialist. Thorough inspection included.", "2 hours", BidStatus.WITHDRAWN),
    ]

    for gig_idx, provider_idx, bid_amount, description, estimated_duration, status in bids_data:
        if gig_idx >= len(gig_requests) or provider_idx >= len(service_providers):
            continue

        gig = gig_requests[gig_idx]
        provider = service_providers[provider_idx]

        # Check if bid already exists
        result = await db.execute(
            select(Bid).where(
                Bid.gig_id == gig.id,
                Bid.provider_id == provider.id,
            )
        )
        if result.scalar_one_or_none():
            print(f"ℹ️  Bid already exists for gig {gig.id} by provider {provider.id}")
            continue

        bid = Bid(
            gig_id=gig.id,
            provider_id=provider.id,
            bid_amount=bid_amount,
            description=description,
            estimated_duration=estimated_duration,
            status=status,
        )
        db.add(bid)
        await db.flush()
        created.append(bid)
        print(f"✅ Created bid: ${bid.bid_amount} for '{gig.title}' by provider {provider.id} ({status.value})")

    return created


async def seed_dummy_payments(
    db: AsyncSession,
    gig_requests: List[GigRequest],
) -> List[Payment]:
    """Seed payments for gig requests based on their status."""
    print("Seeding dummy payments...")

    if not gig_requests:
        print("ℹ️  No gig requests to create payments for")
        return []

    created: List[Payment] = []

    # Payment data: (gig_index, payment_status, method)
    # Only create payments for gigs that are IN_PROGRESS or COMPLETED
    payments_data = [
        # Gig 1 (IN_PROGRESS - Electrical): Payment in escrow
        (1, PaymentStatus.ESCROW, "credit_card"),

        # Gig 2 (COMPLETED - Cleaning): Payment released
        (2, PaymentStatus.RELEASED, "credit_card"),

        # Gig 4 (IN_PROGRESS - Painting): Payment in escrow
        (4, PaymentStatus.ESCROW, "paypal"),
    ]

    for gig_idx, payment_status, method in payments_data:
        if gig_idx >= len(gig_requests):
            continue

        gig = gig_requests[gig_idx]

        # Check if payment already exists
        result = await db.execute(
            select(Payment).where(Payment.gig_id == gig.id)
        )
        if result.scalar_one_or_none():
            print(f"ℹ️  Payment already exists for gig {gig.id}")
            continue

        # Use the budget as the payment amount
        payment = Payment(
            gig_id=gig.id,
            amount=gig.budget,
            status=payment_status,
            method=method,
        )
        db.add(payment)
        await db.flush()
        created.append(payment)
        print(f"✅ Created payment: ${payment.amount} for '{gig.title}' ({payment_status.value})")

    return created


# -------------------------
# Orchestration
# -------------------------
async def seed_dev_data():
    """Seed the database with development data"""
    print("🚀 Seeding development data...")

    async_engine = create_async_engine(
        settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
        echo=False,
    )
    async_session = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        try:
            homeowner_role = (await db.execute(select(Role).where(Role.name == "Homeowner"))).scalar_one_or_none()
            service_provider_role = (await db.execute(select(Role).where(Role.name == "ServiceProvider"))).scalar_one_or_none()

            if not homeowner_role:
                print("⚠️  Homeowner role not found. Please run seed_data.py first.")
                return
            if not service_provider_role:
                print("⚠️  ServiceProvider role not found. Please run seed_data.py first.")
                return

            # Branch-specific seeders (run if models exist)
            categories = await seed_service_categories(db)
            subcategories = await seed_service_subcategories(db, categories)
            tags = await seed_tags(db)
            category_locales = await seed_service_category_locales(db, categories)
            subcategory_locales = await seed_service_subcategory_locales(db, subcategories)
            tag_locales = await seed_tag_locales(db, tags)

            master_data_list = await seed_master_data(db)
            master_data_locales = await seed_master_data_locales(db, master_data_list)

            # Core dummy data
            homeowners = await seed_dummy_homeowners(db, homeowner_role)
            service_providers = await seed_dummy_service_providers(db, service_provider_role)

            all_homeowners_result = await db.execute(
                select(Homeowner).join(User).where(User.email.like('%homeowner@example.com'))
            )
            all_homeowners = list(all_homeowners_result.scalars().all())

            addresses = await seed_dummy_addresses(db, all_homeowners)
            gig_requests = await seed_dummy_gig_requests(db, all_homeowners, addresses, categories, subcategories)

            # Get all service providers for bidding
            all_providers_result = await db.execute(
                select(ServiceProvider).join(User).where(User.email.like('%@example.com'))
            )
            all_providers = list(all_providers_result.scalars().all())

            # Seed bids and payments
            bids = await seed_dummy_bids(db, gig_requests, all_providers)
            payments = await seed_dummy_payments(db, gig_requests)

            await db.commit()

            print("\n🎉 Development seed data summary:")
            if HAS_SERVICE_TAXONOMY:
                print(f"✅ Service Categories: {len(categories)}")
                print(f"✅ Service SubCategories: {len(subcategories)}")
                print(f"✅ Tags: {len(tags)}")
                print(f"✅ Service Category Locales: {len(category_locales)}")
                print(f"✅ Service SubCategory Locales: {len(subcategory_locales)}")
                print(f"✅ Tag Locales: {len(tag_locales)}")
            else:
                print("ℹ️  Service taxonomy skipped (models not present).")

            if HAS_MASTER_DATA:
                print(f"✅ Master Data Entries: {len(master_data_list)}")
                print(f"✅ Master Data Locales: {len(master_data_locales)}")
            else:
                print("ℹ️  Master data skipped (models not present).")

            print(f"✅ Dummy Homeowners: {len(homeowners)}")
            print(f"✅ Dummy Service Providers: {len(service_providers)}")
            print(f"✅ Dummy Addresses: {len(addresses)}")
            print(f"✅ Dummy Gig Requests: {len(gig_requests)}")
            print(f"✅ Dummy Bids: {len(bids)}")
            print(f"✅ Dummy Payments: {len(payments)}")
            print("\n📋 Default login credentials for all dummy accounts:")
            print("   Homeowners: password 'homeowner123'")
            print("   Service Providers: password 'provider123'")

        except Exception as e:
            print(f"❌ Error seeding development data: {str(e)}")
            await db.rollback()
            raise


async def main():
    """Main function to initialize development data"""
    try:
        print("🚀 Starting development data seeding...")
        await seed_dev_data()
        print("✅ Development data seeding completed successfully!")
    except Exception as e:
        print(f"❌ Development data seeding failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
