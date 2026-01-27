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

# Expose port (Railway will inject PORT)
EXPOSE 3000

# Start command - use shell to expand PORT variable
CMD ["sh", "-c", "npx serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"]
