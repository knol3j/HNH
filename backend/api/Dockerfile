FROM node:18-bullseye-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy Prisma schema (must be in build context - either copied to api/ or build context is backend/)
COPY schema.prisma ./

# Generate Prisma client
RUN npx prisma generate

# Copy the API server file
COPY index.js ./

# Expose API port
EXPOSE 8080

# Run migrations and start server
CMD npx prisma db push --accept-data-loss && node index.js

