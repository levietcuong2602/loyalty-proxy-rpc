# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

RUN apk add --no-cache git
# Install dependencies with legacy peer deps
RUN npm i --legacy-peer-deps

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

RUN apk add --no-cache git curl
# Install production dependencies only with legacy peer deps

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Only set NODE_ENV as build-time variable
ENV NODE_ENV=production

# Expose port (will be overridden by runtime PORT env var)
EXPOSE 5001

# Start application
CMD ["node", "dist/main"]
