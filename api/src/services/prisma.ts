import { PrismaClient } from '@prisma/client'

export const prisma =
  globalThis.__prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error']
  })

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined
}

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma__ = prisma
}
