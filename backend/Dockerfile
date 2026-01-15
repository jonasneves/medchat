# MedChat Server Dockerfile
# Multi-stage build: frontend + backend

# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    httpx \
    pydantic

COPY backend/server.py .

# Copy built frontend from builder stage
COPY --from=frontend-builder /build/dist ./static

ENV PORT=8500
EXPOSE 8500

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8500/api/health || exit 1

CMD ["python", "server.py"]
