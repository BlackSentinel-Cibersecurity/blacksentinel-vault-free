FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS production

RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S blacksentinel && \
    adduser -S blacksentinel -u 1001

WORKDIR /app

COPY --from=builder --chown=blacksentinel:blacksentinel /app/node_modules ./node_modules
COPY --from=builder --chown=blacksentinel:blacksentinel /app/dist ./dist
COPY --from=builder --chown=blacksentinel:blacksentinel /app/public ./public
COPY --from=builder --chown=blacksentinel:blacksentinel /app/package.json ./

# winston's file transports write to ./logs (relative to CWD) — create it
# up front and hand it to the non-root user, or the app crashes on boot
# trying to mkdir into a root-owned /app.
RUN mkdir -p logs && chown blacksentinel:blacksentinel logs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

USER blacksentinel

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
