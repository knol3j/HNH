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

# Expose port
ENV PORT=3000
EXPOSE 3000

# Start command
# Start command
CMD npx serve -s dist -l ${PORT:-3000}
