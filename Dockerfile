# Multi-Stage Production Dockerfile for ResolveOS
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY packages/ packages/
COPY apps/ apps/

RUN npm install
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts and set node user ownership
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/packages/ packages/
COPY --chown=node:node --from=builder /app/apps/api/dist apps/api/dist
COPY --chown=node:node --from=builder /app/apps/api/package*.json apps/api/
COPY --chown=node:node --from=builder /app/apps/web/dist apps/web/dist

USER node
RUN npm install --omit=dev

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
