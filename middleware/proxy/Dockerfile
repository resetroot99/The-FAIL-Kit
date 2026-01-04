# F.A.I.L. Kit Universal Proxy
# Intercepts HTTP calls and generates forensic receipts automatically

FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S failkit && \
    adduser -S failkit -u 1001 -G failkit

# Create receipts directory
RUN mkdir -p /app/receipts && chown -R failkit:failkit /app

USER failkit

# Environment variables
ENV NODE_ENV=production
ENV PROXY_PORT=8080
ENV PROXY_SSL_PORT=8443
ENV RECEIPT_DIR=/app/receipts
ENV LOG_LEVEL=info

# Expose ports
EXPOSE 8080 8443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start proxy
CMD ["node", "dist/index.js"]
