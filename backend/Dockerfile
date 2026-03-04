FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/

# Create data directories
RUN mkdir -p /data/fastf1_cache /data/csv_exports

ENV FASTF1_CACHE_DIR=/data/fastf1_cache \
    CSV_EXPORT_DIR=/data/csv_exports \
    DATABASE_URL=sqlite+aiosqlite:////data/f1_strategy.db \
    SYNC_DATABASE_URL=sqlite:////data/f1_strategy.db

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
