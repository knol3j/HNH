FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./

# Expose Stratum Port
EXPOSE 3333

CMD ["node", "server.js"]
