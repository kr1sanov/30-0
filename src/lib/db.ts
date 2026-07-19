import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Read .env file directly if DATABASE_URL is not set properly
// Searches multiple locations since the CWD may vary depending on
// how the app is started (dev, standalone, Passenger entrypoint).
function loadEnvFromFile() {
  if (process.env.DATABASE_URL) return

  // Possible locations for .env file, in order of priority:
  // 1. Current working directory (standard Next.js behavior)
  // 2. Parent directory (when CWD is .next/standalone/ inside Passenger)
  // 3. App root detected from __dirname (fallback for standalone deployments)
  const searchPaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '.env'),
    resolve(process.cwd(), '..', '..', '.env'),
  ]

  for (const envPath of searchPaths) {
    try {
      const envContent = readFileSync(envPath, 'utf-8')
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex === -1) continue
        const key = trimmed.slice(0, eqIndex).trim()
        const value = trimmed.slice(eqIndex + 1).trim()
        if (key === 'DATABASE_URL' && !process.env.DATABASE_URL) {
          process.env.DATABASE_URL = value
          return
        }
      }
    } catch {
      // .env file doesn't exist at this path — try next
    }
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
