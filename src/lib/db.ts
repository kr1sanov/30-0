import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure for both SQLite (dev) and PostgreSQL (Supabase prod)
const isProd = process.env.NODE_ENV === 'production'

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['error', 'warn'] : ['query'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
