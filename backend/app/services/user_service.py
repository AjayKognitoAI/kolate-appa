from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, asc, desc
from math import ceil
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserSearch
from app.schemas.feature import PaginationParams, PaginatedResponse
from app.core.cache import cacheable, cacheevict, EvictionStrategy
from .crud_service import CRUDService


class UserService(CRUDService[User, UserCreate, UserUpdate, UserSearch]):
    def __init__(self):
        super().__init__(
            model=User,
            cache_prefix="users",
            default_cache_ttl=300,
            searchable_fields=["email", "name", "phone", "is_active"],
            sortable_fields=["id", "email", "name", "phone", "created_at", "updated_at"],
            cached_methods=["get_by_id", "get_all", "exists", "get_by_field"],
            excluded_methods=[]
        )

    @cacheable(ttl=600, key_prefix="user", condition="email is not None")
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    @cacheable(
        ttl=600,
        key_template="user:email:{email}",
        condition="email is not None",
        unless="result is None"
    )
    async def get_by_email_async(self, db: AsyncSession, *, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @cacheable(ttl=600, key_prefix="user_phone", condition="phone is not None")
    def get_by_phone(self, db: Session, *, phone: str) -> Optional[User]:
        return db.query(User).filter(User.phone == phone).first()

    @cacheable(
        ttl=600,
        key_template="user:phone:{phone}",
        condition="phone is not None",
        unless="result is None"
    )
    async def get_by_phone_async(self, db: AsyncSession, *, phone: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    @cacheevict(
        pattern="user:*",
        strategy=EvictionStrategy.PATTERN,
        condition="result is not None"
    )
    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            name=obj_in.name,
            phone=obj_in.phone,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @cacheevict(
        pattern="user:*",
        strategy=EvictionStrategy.PATTERN,
        condition="result is not None"
    )
    async def create_async(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            name=obj_in.name,
            phone=obj_in.phone,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


    def is_active(self, user: User) -> bool:
        return user.is_active

    async def get_all_by_user(
        self,
        db: AsyncSession,
        user_id: str,
        pagination: Optional[PaginationParams] = None
    ) -> PaginatedResponse:
        """
        Get all users belonging to a specific user (typically just their own record).

        Args:
            db: Database session
            user_id: User ID
            pagination: Pagination parameters

        Returns:
            Paginated response with user records
        """
        # Build base query - users can only see their own record
        query = select(User).where(User.id == user_id)

        # Get total count
        count_query = select(func.count(User.id)).where(User.id == user_id)
        total = await db.scalar(count_query)

        # Apply sorting
        if pagination:
            sort_column = self._get_sort_column(pagination.sort_by)
            if sort_column is not None:
                if pagination.sort_order.lower() == "desc":
                    query = query.order_by(desc(sort_column))
                else:
                    query = query.order_by(asc(sort_column))

            # Apply pagination (skip if size = -1 to fetch all records)
            if pagination.size != -1:
                offset = (pagination.page - 1) * pagination.size
                query = query.offset(offset).limit(pagination.size)

        # Execute query
        result = await db.execute(query)
        items = result.scalars().all()

        # Calculate pagination info
        if pagination and pagination.size != -1:
            pages = ceil(total / pagination.size) if total > 0 else 0
            has_next = pagination.page < pages
            has_prev = pagination.page > 1
            page = pagination.page
            size = pagination.size
        else:
            # When fetching all records or no pagination
            pages = 1
            has_next = False
            has_prev = False
            page = 1
            size = total

        return PaginatedResponse(
            items=list(items),
            total=total,
            page=page,
            size=size,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev,
        )

    @cacheable(
        ttl=300,
        key_template="user_access_verify:{user_id}:{target_user_id}"
    )
    async def verify_user_access(self, db: AsyncSession, user_id: str, target_user_id: int) -> bool:
        """
        Verify if a user has access to a specific user record.
        Users can only access their own records.

        Args:
            db: Database session
            user_id: User ID from token to check
            target_user_id: Target user ID to check access for

        Returns:
            True if user has access, False otherwise
        """
        return str(target_user_id) == user_id


user_service = UserService()