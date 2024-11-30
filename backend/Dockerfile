# Use Python base image with slim variant
FROM python:3.9-slim

# Install system dependencies and cleanup
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    libopencv-dev \
    python3-opencv \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Environment variables
ENV PORT=5000
ENV MAX_WORKERS=4
ENV PROCESS_TIMEOUT=30
ENV REQUESTS_PER_MINUTE=20

# Expose the port
EXPOSE ${PORT}

# Healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/ || exit 1

# Start FastAPI with Uvicorn
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT} --workers ${MAX_WORKERS}"]