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

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/ packages/
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/package*.json apps/api/
COPY --from=builder /app/apps/web/dist apps/web/dist

RUN npm install --omit=dev

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
