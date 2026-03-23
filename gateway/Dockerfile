FROM python:3.13-slim

WORKDIR /app

# Install build deps for aiosqlite et al.
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

COPY gateway/ ./gateway/

# Data directory for SQLite volume mount
RUN mkdir -p /data

EXPOSE 8000

# Single worker — required for SQLite + aiosqlite
CMD ["uvicorn", "gateway.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
