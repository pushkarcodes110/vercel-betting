import type { Context, Next } from 'hono'
import { getSessionCookie, verifySessionToken } from '../utils/session'
import { prisma } from '../services/prisma'

export const optionalAuth = async (c: Context, next: Next) => {
  const token = getSessionCookie(c)
  if (!token) return next()

  const session = await verifySessionToken(token)
  if (!session) return next()

  const userId = Number.parseInt(session.sub, 10)
  if (Number.isNaN(userId)) return next()

  const user = await prisma.customUser.findUnique({
    where: { id: userId },
    select: { id: true, username: true, is_staff: true, is_superuser: true }
  })

  if (!user) return next()

  c.set('user', user)
  return next()
}

export const requireAuth = async (c: Context, next: Next) => {
  await optionalAuth(c, async () => undefined)

  const user = c.get('user')
  if (!user) {
    return c.json({ success: false, error: 'Authentication required' }, 401)
  }

  return next()
}

export const requireAdmin = async (c: Context, next: Next) => {
  const authResponse = await requireAuth(c, async () => undefined)
  if (authResponse) return authResponse

  const user = c.get('user')
  if (!user.is_staff && !user.is_superuser) {
    return c.json({ success: false, error: 'Admin access required' }, 403)
  }

  return next()
}
