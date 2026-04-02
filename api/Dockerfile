FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY api/package*.json ./
RUN npm ci

# Generate Prisma client — falls back to prisma/schema.prisma by convention
COPY api/prisma ./prisma
RUN npx prisma generate

# Compile NestJS — only src/ in scope, no prisma.config.ts to confuse tsc
COPY api/src ./src
COPY api/tsconfig*.json ./
COPY api/nest-cli.json ./
RUN npm run build && echo "=== dist contents ===" && ls -la dist/ && ls -la dist/src/ | head -5

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# prisma.config.ts needed at runtime for prisma db push
COPY api/prisma.config.ts ./
COPY api/tsconfig*.json ./

EXPOSE 4000

CMD ["node", "dist/src/main.js"]
