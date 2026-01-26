FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Verify build output
RUN ls -la dist/index.html

# Expose port
ENV PORT=3000
EXPOSE 3000

# Start command
CMD ["npm", "run", "preview:prod"]
