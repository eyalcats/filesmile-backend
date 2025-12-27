# FileSmile Backend Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first (better layer caching)
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/ .

# Copy frontend and outlook-addin for serving static files
COPY frontend/ /app/frontend/
COPY outlook-addin/ /app/outlook-addin/

# Move seed database to separate location (will be copied to volume on first run)
RUN mkdir -p /app/db-seed && \
    if [ -f /app/db/filesmile.db ]; then mv /app/db/filesmile.db /app/db-seed/; fi

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh

# Create non-root user and set permissions
RUN useradd --create-home --uid 1000 appuser && \
    chown -R appuser:appuser /app && \
    chmod +x /app/entrypoint.sh

USER appuser

# Expose port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/health')"

# Run via entrypoint (handles db initialization)
ENTRYPOINT ["/app/entrypoint.sh"]
