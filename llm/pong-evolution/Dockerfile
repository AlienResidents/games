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

# Run with eventlet for WebSocket support
CMD ["python", "-c", "from app import app, socketio; socketio.run(app, host='0.0.0.0', port=5000)"]
