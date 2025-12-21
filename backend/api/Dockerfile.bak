FROM node:18-alpine

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

CMD ["node", "index.js"]

