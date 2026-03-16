FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build
RUN ls -la dist/index.html

FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist

RUN npm install -g serve@14.2.4

EXPOSE 3000

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"]
