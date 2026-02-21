FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV ACCESS_MODE=none
ENV DB_PATH=/data/lab-dashboard.sqlite
ENV BACKUP_DIR=/data/backups
ENV BACKUP_KEEP_DAYS=30

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/db ./db
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /data/backups
EXPOSE 3000

CMD ["node", "server.js"]
