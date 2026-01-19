"""FastAPI application for simplified Data Science RAG system."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from py_eureka_client import eureka_client

from api.dependencies import get_rag, initialize_services, shutdown_services
from api.routes import sessions_router, analysis_router, upload_router, visualizations_router, trials_router
from api.config import get_settings
from api.agent.rag_system import RAGSystem

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    print("\n" + "=" * 60)
    print("Data Science & ML RAG Chatbot API - Starting Up")
    print("=" * 60)

    # Initialize services
    try:
        initialize_services()
        print("\n" + "=" * 60)
        print("Application startup complete - Ready to accept requests")
        print("=" * 60 + "\n")
    except Exception as e:
        print("\n" + "=" * 60)
        print(f"Application startup failed: {e}")
        print("=" * 60 + "\n")
        raise

    # Register with Eureka
    try:
        await eureka_client.init_async(
            eureka_server=settings.EUREKA_SERVER,
            app_name=settings.APP_NAME,
            instance_port=settings.PORT,
            instance_host=settings.EUREKA_INSTANCE_HOST,
            health_check_url=f"http://{settings.EUREKA_INSTANCE_HOST}:{settings.PORT}/api/copilot-data-science-ml-agent/v1/health",
            status_page_url=f"http://{settings.EUREKA_INSTANCE_HOST}:{settings.PORT}/docs",
            renewal_interval_in_secs=10,
            duration_in_secs=30
        )
        print(f"Registered with Eureka server: {settings.EUREKA_SERVER}")
    except Exception as e:
        print(f"Failed to register with Eureka (non-fatal): {e}")

    yield

    # Shutdown
    print("\n" + "=" * 60)
    print("Data Science & ML RAG Chatbot API - Shutting Down")
    print("=" * 60)

    # Shutdown services (scheduler, etc.)
    shutdown_services()

    # Eureka client handles deregistration automatically
    print("[OK] Shutdown complete")


# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="API for Data Science & ML RAG Chatbot with pre-computed analysis and ChromaDB RAG",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS middleware for frontend integration
# NOTE: Disabled because API Gateway/reverse proxy handles CORS
# If running locally without a gateway, uncomment the lines below:
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # Update with specific origins in production
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# API prefix for all endpoints
API_PREFIX = "/api/copilot-data-science-ml-agent"

# Include routers
# API Router configuration
api_router = APIRouter()
api_router.include_router(sessions_router, prefix="/sessions")
api_router.include_router(analysis_router, prefix="/analyze")
api_router.include_router(upload_router, prefix="/upload")
api_router.include_router(visualizations_router, prefix="/visualizations")
api_router.include_router(trials_router, prefix="/trials")

# Include the API router with version prefix
app.include_router(api_router, prefix=f"{API_PREFIX}/v1")





# Root and health endpoints
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Data Science & ML Chatbot API",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_prefix": API_PREFIX,
        "status": "running"
    }


@app.get(f"{API_PREFIX}/v1/health")
async def health_check(
    rag: RAGSystem = Depends(get_rag)
):
    """Health check endpoint."""
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.APP_NAME,
        "system": "simplified_rag",
        "model": os.getenv("MODEL_NAME", "gemini-2.0-flash-exp"),
        "chroma_db": "connected",
        "database": "connected"
    }


@app.get(f"{API_PREFIX}/v1/capabilities")
async def get_capabilities():
    """Get system capabilities (simplified without tools)."""
    return {
        "system": "Simplified Data Science RAG",
        "version": settings.VERSION,
        "capabilities": [
            "CSV/Excel file analysis with pre-computation",
            "Automatic EDA generation",
            "Statistical analysis (descriptive, correlations, distributions, outliers)",
            "Data quality assessment",
            "Pattern and anomaly detection",
            "Visualization generation",
            "Semantic RAG with per-session ChromaDB collections",
            "LLM-powered chat with context retrieval",
            "LiteLLM support for multiple providers (Gemini, OpenAI, Claude, etc.)",
            "S3 bucket integration with automatic trial sync",
            "Trial-based data organization and querying"
        ],
        "supported_formats": ["CSV", "Excel (.xlsx, .xls)"],
        "model": os.getenv("MODEL_NAME", "gemini-2.0-flash-exp"),
        "rag_enabled": True,
        "features": {
            "per_session_vector_db": True,
            "per_trial_vector_db": True,
            "automatic_analysis": True,
            "semantic_search": True,
            "conversation_memory": True,
            "s3_sync": settings.S3_SYNC_ENABLED,
            "trial_based_chat": True
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
