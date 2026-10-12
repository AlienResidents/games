FROM nginxinc/nginx-unprivileged:alpine

LABEL maintainer="Chrispy <alienresidents@gmail.com>"
LABEL description="Border Runner - A Smuggler's Tale"

COPY --chmod=644 index.html /usr/share/nginx/html/
COPY --chmod=644 game.js /usr/share/nginx/html/
COPY --chmod=644 style.css /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1
