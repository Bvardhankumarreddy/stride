FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY api/package*.json ./
RUN npm ci

# Generate Prisma client
COPY api/prisma ./prisma
RUN npx prisma generate

# Build
COPY api/src ./src
COPY api/tsconfig*.json ./
COPY api/nest-cli.json ./
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --url=$DATABASE_URL && node dist/main"]
