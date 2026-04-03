# Stage 1: Build the library bundle
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

# Stage 2: Serve static assets with nginx
FROM nginx:stable-alpine AS runner

COPY --from=builder /app/docker/index.html /usr/share/nginx/html/index.html
COPY --from=builder /app/dist/scenaria.iife.js /usr/share/nginx/html/
COPY --from=builder /app/dist/scenaria.css /usr/share/nginx/html/
COPY --from=builder /app/favicon.png /usr/share/nginx/html/

EXPOSE 80
