# Lightweight agent: no xmrig (cloud-hosted, API/coordination only)
FROM node:20-bullseye-slim

# Create app directory
WORKDIR /app

# Copy agent source
COPY package*.json ./
RUN npm ci --only=production

COPY ./ ./

# Create data directory for persistence
RUN mkdir -p /app/data

# Environment
ENV PORT=4343
ENV NODE_ENV=production
ENV HNH_CLOUD_MODE=true

# Expose API port
EXPOSE 4343

# Start agent
CMD ["node", "server.js"]
