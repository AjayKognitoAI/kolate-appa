from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_async_db
from app.core.cache import cache_manager
from app.schemas.common import MessageResponse

router = APIRouter()


@router.get("", response_model=MessageResponse)
async def health_check():
    return MessageResponse(message="Service is healthy")


@router.get("/database", response_model=MessageResponse)
async def database_health_check(db: AsyncSession = Depends(get_async_db)):
    try:
        # Simple query to check database connection
        await db.execute(text("SELECT 1"))
        return MessageResponse(message="Database connection is healthy")
    except Exception as e:
        return MessageResponse(message=f"Database connection failed: {str(e)}")


@router.get("/cache", response_model=MessageResponse)
async def cache_health_check():
    try:
        cache_type = cache_manager.get_cache_type().value
        health_status = await cache_manager.health_check()

        if health_status:
            await cache_manager.set("health_check", "ok", expire=60)
            result = await cache_manager.get("health_check")
            if result == "ok":
                return MessageResponse(message=f"Cache ({cache_type}) connection is healthy")
            else:
                return MessageResponse(message=f"Cache ({cache_type}) connection test failed")
        else:
            return MessageResponse(message=f"Cache ({cache_type}) health check failed")
    except Exception as e:
        cache_type = cache_manager.get_cache_type().value
        return MessageResponse(message=f"Cache ({cache_type}) connection failed: {str(e)}")