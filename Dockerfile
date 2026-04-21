# syntax=docker/dockerfile:1.7

# --- Stage 1: build the Vite/React app ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies with cached layer
COPY package.json package-lock.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build

# --- Stage 2: serve the static files with Caddy ---
FROM caddy:2-alpine AS runtime

# Static assets
COPY --from=builder /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

# Once.sh conventions
VOLUME ["/storage"]
EXPOSE 80

# Healthcheck (mirrors /up)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
	CMD wget -qO- http://127.0.0.1/up || exit 1

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
