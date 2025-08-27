# Use official Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your code
COPY . .

# Expose port 8080 for Fly.io
EXPOSE 8080

# Run the app using gunicorn for production
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]
