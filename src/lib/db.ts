import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read .env file directly if env vars aren't set properly
// This handles cases where the shell environment overrides .env
function loadEnvFromFile() {
  if (process.env.DATABASE_URL?.startsWith('postgresql://')) return

  try {
    const envPath = resolve(process.cwd(), '.env')
    const envContent = readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim()
      // Only set if not already set to a valid postgres URL
      if (key === 'DATABASE_URL' && !process.env.DATABASE_URL?.startsWith('postgresql://')) {
        process.env.DATABASE_URL = value
      }
      if (key === 'DIRECT_URL' && !process.env.DIRECT_URL?.startsWith('postgresql://')) {
        process.env.DIRECT_URL = value
      }
    }
  } catch {
    // .env file doesn't exist or can't be read — rely on shell env
  }
}

loadEnvFromFile()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
