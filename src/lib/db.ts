import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configure for both SQLite (dev) and PostgreSQL (Supabase prod)
const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql://')

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
        ...(isPostgres && process.env.DIRECT_URL
          ? { directUrl: process.env.DIRECT_URL }
          : {}),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
