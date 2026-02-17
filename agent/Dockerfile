FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY . .

# Run with unbuffered output and set Python path
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

CMD ["python", "run.py"]
