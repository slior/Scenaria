# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application from a lightweight Nginx server
FROM nginx:stable-alpine AS runner

# Copy built assets from the builder stage
COPY --from=builder /app/index.html /usr/share/nginx/html/index.html
COPY --from=builder /app/viewer.html /usr/share/nginx/html/viewer.html
COPY --from=builder /app/main.js /usr/share/nginx/html/main.js
COPY --from=builder /app/favicon.png /usr/share/nginx/html/favicon.png
COPY --from=builder /app/src/Editor.js /usr/share/nginx/html/src/Editor.js
COPY --from=builder /app/lib /usr/share/nginx/html/lib

# Expose port 80
EXPOSE 80 