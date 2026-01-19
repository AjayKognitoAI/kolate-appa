from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feature import Feature
from app.schemas.feature import FeatureCreate, FeatureUpdate, FeatureSearch
from app.services.crud_service import CRUDService


class FeatureService(CRUDService[Feature, FeatureCreate, FeatureUpdate, FeatureSearch]):
    """
    Feature service with CRUD operations, caching, and search capabilities.

    This service extends the generic CRUD service with Feature-specific
    functionality and configurations.
    """

    def __init__(self):
        """Initialize Feature service with specific configurations."""
        super().__init__(
            model=Feature,
            cache_prefix="features",
            default_cache_ttl=600,  # Cache features for 10 minutes
            searchable_fields=["name", "description"],
            sortable_fields=["id", "name", "created_at", "updated_at"],
            cached_methods=["get_by_id", "get_all", "exists"],
            excluded_methods=[]  # Can exclude specific methods if needed
        )

    async def get_by_name(self, db: AsyncSession, name: str) -> Optional[Feature]:
        """
        Get feature by name.

        Args:
            db: Database session
            name: Feature name

        Returns:
            Feature instance or None if not found
        """
        return await self.get_by_field(db, "name", name)

    async def get_multiple_by_names(self, db: AsyncSession, names: List[str]) -> List[Feature]:
        """
        Get multiple features by names.

        Args:
            db: Database session
            names: List of feature names

        Returns:
            List of Feature instances
        """
        return await self.get_multiple_by_field(db, "name", names)

    async def check_name_exists(self, db: AsyncSession, name: str, exclude_id: Optional[int] = None) -> bool:
        """
        Check if feature name already exists.

        Args:
            db: Database session
            name: Feature name to check
            exclude_id: Feature ID to exclude from check (for updates)

        Returns:
            True if name exists, False otherwise
        """
        from sqlalchemy import select, and_

        query = select(Feature.id).where(Feature.name == name)

        if exclude_id:
            query = query.where(Feature.id != exclude_id)

        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    async def create_with_validation(self, db: AsyncSession, feature_in: FeatureCreate) -> Feature:
        """
        Create feature with name uniqueness validation.

        Args:
            db: Database session
            feature_in: Feature creation data

        Returns:
            Created feature

        Raises:
            ValueError: If feature name already exists
        """
        # Check if name already exists
        if await self.check_name_exists(db, feature_in.name):
            raise ValueError(f"Feature with name '{feature_in.name}' already exists")

        return await self.create(db, feature_in)

    async def update_with_validation(
        self,
        db: AsyncSession,
        feature_id: int,
        feature_in: FeatureUpdate
    ) -> Optional[Feature]:
        """
        Update feature with name uniqueness validation.

        Args:
            db: Database session
            feature_id: Feature ID
            feature_in: Feature update data

        Returns:
            Updated feature or None if not found

        Raises:
            ValueError: If feature name already exists for another feature
        """
        # Check if name already exists for another feature
        if feature_in.name and await self.check_name_exists(db, feature_in.name, exclude_id=feature_id):
            raise ValueError(f"Feature with name '{feature_in.name}' already exists")

        return await self.update(db, feature_id, feature_in)

    async def get_features_with_permissions(self, db: AsyncSession) -> List[Feature]:
        """
        Get all features with their associated permissions.

        Args:
            db: Database session

        Returns:
            List of features with permissions loaded
        """
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        query = select(Feature).options(selectinload(Feature.permissions))
        result = await db.execute(query)
        return result.scalars().all()

    async def search_by_description_keywords(
        self,
        db: AsyncSession,
        keywords: List[str]
    ) -> List[Feature]:
        """
        Search features by description keywords.

        Args:
            db: Database session
            keywords: List of keywords to search for

        Returns:
            List of matching features
        """
        from sqlalchemy import select, or_

        if not keywords:
            return []

        # Build search conditions for each keyword
        conditions = []
        for keyword in keywords:
            conditions.append(Feature.description.ilike(f"%{keyword}%"))

        query = select(Feature).where(or_(*conditions))
        result = await db.execute(query)
        return result.scalars().all()

    async def create_bulk_with_validation(self, db: AsyncSession, features_in: List[FeatureCreate]) -> List[Feature]:
        """
        Create multiple features in bulk with name uniqueness validation.

        Args:
            db: Database session
            features_in: List of feature creation data

        Returns:
            List of created features

        Raises:
            ValueError: If duplicate names in request or names already exist
        """
        # Validate that all names are unique within the request
        names = [f.name for f in features_in]
        if len(names) != len(set(names)):
            raise ValueError("Duplicate feature names in request")

        # Check if any names already exist in database
        for feature_in in features_in:
            if await self.check_name_exists(db, feature_in.name):
                raise ValueError(f"Feature with name '{feature_in.name}' already exists")

        # Use the parent's bulk creation method
        return await self.create_bulk(db, features_in)


# Global service instance
feature_service = FeatureService()