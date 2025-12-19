FROM nginx:alpine

LABEL maintainer="Chrispy <alienresidents@gmail.com>"
LABEL description="Pong Evolution - Genetic Algorithm Tournament"

COPY --chmod=644 index.html /usr/share/nginx/html/
COPY --chmod=644 game.js /usr/share/nginx/html/
COPY --chmod=644 style.css /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
