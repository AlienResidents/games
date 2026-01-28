FROM python:3.11-alpine

LABEL maintainer="Chrispy <alienresidents@gmail.com>"
LABEL description="Pong Evolution - Flask/WebSocket Genetic Algorithm Tournament"

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chmod=644 app.py game.py genetic.py tournament.py ./
COPY --chmod=644 templates/ ./templates/
COPY --chmod=644 static/ ./static/

# Expose port
EXPOSE 5000

# Run with gunicorn and eventlet worker for WebSocket support
CMD ["gunicorn", "--worker-class", "eventlet", "-w", "1", "--bind", "0.0.0.0:5000", "app:app"]
