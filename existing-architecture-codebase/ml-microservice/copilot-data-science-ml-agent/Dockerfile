# Data Science & ML Chatbot Backend
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
# Set Hugging Face cache directory to persist model downloads
ENV HF_HOME=/app/.cache/huggingface
ENV SENTENCE_TRANSFORMERS_HOME=/app/.cache/sentence_transformers

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model used by ChromaDB (all-MiniLM-L6-v2)
# This avoids downloading at runtime on first request
RUN python -c "from chromadb.utils.embedding_functions import DefaultEmbeddingFunction; ef = DefaultEmbeddingFunction(); ef(['test'])"

# Copy application code
COPY api/ ./api/
COPY data_science_agent/ ./data_science_agent/

# Copy environment files
COPY .env.local .env.local
COPY .env.dev .env.dev
COPY .env .env

# Copy and setup entrypoint (convert Windows line endings to Unix)
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Create all necessary data directories (will be mounted from host for persistence)
RUN mkdir -p /app/data/uploads \
             /app/data/visualizations \
             /app/data/db \
             /app/data/chroma_db \
             /app/data/analysis_cache

# Environment file to load (can be overridden at runtime)
ENV ENV_FILE .env

# Expose port
EXPOSE 9061

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/api/copilot-data-science-ml-agent/v1/health || exit 1

# Run the app via entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]
