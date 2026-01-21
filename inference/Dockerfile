# MedGemma Inference Server Dockerfile
FROM python:3.11-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libopenblas-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY inference/requirements.txt .

# Build with OpenBLAS, OpenMP, NEON, Native SIMD, Flash Attention for ARM64
RUN CMAKE_ARGS="-DLLAMA_BLAS=ON -DLLAMA_BLAS_VENDOR=OpenBLAS -DGGML_OPENMP=ON -DGGML_NEON=ON -DGGML_NATIVE=ON -DLLAMA_FLASH_ATTN=ON" \
    pip3 install --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/venv/bin:$PATH"
ENV OMP_NUM_THREADS=4
ENV OPENBLAS_NUM_THREADS=1

RUN apt-get update && apt-get install -y \
    libopenblas0-pthread \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 10000 appuser

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv

COPY --chown=appuser:appuser inference/multimodal_base.py .
COPY --chown=appuser:appuser inference/inference_server.py .

RUN chown -R appuser:appuser /app

USER appuser

ENV PORT=8400
EXPOSE 8400

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8400/health || exit 1

CMD ["python3", "inference_server.py"]
