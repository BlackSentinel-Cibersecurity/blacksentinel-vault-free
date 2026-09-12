# ============================================
# Multi-stage build for BlackSentinel Vault
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/*/package.json ./packages/
COPY services/*/package.json ./services/
COPY apps/*/package.json ./apps/

# Install dependencies
RUN npm ci --workspace=@blacksentinel/*

# Copy source code
COPY . .

# Build packages
RUN npm run build --workspace=@blacksentinel/types
RUN npm run build --workspace=@blacksentinel/crypto
RUN npm run build --workspace=@blacksentinel/auth
RUN npm run build --workspace=@blacksentinel/audit
RUN npm run build --workspace=@blacksentinel/ui

# Build services
RUN npm run build --workspace=@blacksentinel/api-gateway
RUN npm run build --workspace=@blacksentinel/secrets-engine
RUN npm run build --workspace=@blacksentinel/pam-service

# Build web console
RUN npm run build --workspace=@blacksentinel/web-console

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S blacksentinel && \
    adduser -S blacksentinel -u 1001

# Copy built artifacts
COPY --from=builder --chown=blacksentinel:blacksentinel /app/node_modules ./node_modules
COPY --from=builder --chown=blacksentinel:blacksentinel /app/packages/*/dist ./packages/
COPY --from=builder --chown=blacksentinel:blacksentinel /app/services/*/dist ./services/
COPY --from=builder --chown=blacksentinel:blacksentinel /app/apps/web-console/.next ./apps/web-console/.next
COPY --from=builder --chown=blacksentinel:blacksentinel /app/apps/web-console/public ./apps/web-console/public
COPY --from=builder --chown=blacksentinel:blacksentinel /app/package.json ./
COPY --from=builder --chown=blacksentinel:blacksentinel /app/apps/web-console/package.json ./apps/web-console/

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose ports
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Switch to non-root user
USER blacksentinel

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/web-console/.next/standalone/server.js"]
