# Multi-stage build: fetch xmrig binary, then copy
FROM alpine:3.19 AS downloader

ARG XMRIG_VERSION=v6.22.0
ARG XMRIG_URL="https://github.com/xmrig/xmrig/releases/download/${XMRIG_VERSION}/xmrig-${XMRIG_VERSION}-linux-static-x64.tar.gz"

RUN apk add --no-cache curl && \
    mkdir -p /xmrig && \
    curl -L "$XMRIG_URL" | tar xz -C /xmrig --strip-components=1

# Final image
FROM node:20-bullseye-slim

# Install dependencies for xmrig and tools
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    libuv1 \
    libhwloc15 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy agent source
COPY package*.json ./
RUN npm ci --only=production

COPY ./ ./

# Copy XMRig binary from downloader stage (to /app/bin where server.js expects it)
COPY --from=downloader /xmrig /app/bin

# Debug: list files in bin to confirm binary is there
RUN ls -la /app/bin

# Create data directory for persistence
RUN mkdir -p /app/data

# Environment
ENV PORT=4343
ENV AGENT_SECRET=HNH_LOCAL_AGENT_SECRET
ENV NODE_ENV=production

# Expose API and telemetry ports
EXPOSE 4343

# Start agent
CMD ["node", "server.js"]
