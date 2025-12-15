FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY server.js ./

# Expose Stratum Port
EXPOSE 3333

CMD ["node", "server.js"]
