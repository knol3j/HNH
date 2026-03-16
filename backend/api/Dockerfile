FROM node:18-bullseye-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema (must be in build context - either copied to api/ or build context is backend/)
COPY schema.prisma ./

# Generate Prisma client
RUN npx prisma generate

# Copy API server files
COPY index.js ./
COPY persistentStore.js ./
COPY posts.json ./
COPY version.json ./

# Expose API port
EXPOSE 8080

# Sync the current PostgreSQL schema and start the server
CMD npx prisma db push && node index.js

