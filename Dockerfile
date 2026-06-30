# ──────────────────────────────────────────────
# 30-0 RPL — Multi-stage Docker Build
# ──────────────────────────────────────────────
# Optimized for small image size and fast cold starts
# Uses PostgreSQL (Supabase) in production

# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* package-lock.json* yarn.lock* ./

# Install dependencies
RUN \
  if [ -f bun.lockb ]; then npm install -g bun && bun install --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else npm i; \
  fi

# Stage 2: Build
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Switch to PostgreSQL schema for production build
RUN cp prisma/schema.postgresql.prisma prisma/schema.prisma

# Generate Prisma client for PostgreSQL
RUN npx prisma generate

# Set env for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy DATABASE_URL for build (Prisma needs it for generate)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Build the app
RUN npm run build

# Stage 3: Production runner
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and client for runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Set correct ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/formations || exit 1

CMD ["node", "server.js"]
