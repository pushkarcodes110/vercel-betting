import { Hono } from 'hono'
import { prisma } from '../services/prisma'
import { parseJsonBody, fail, ok } from '../utils/http'
import { verifyDjangoPassword } from '../utils/password'
import { clearSessionCookie, getSessionCookie, setSessionCookie, signSession, verifySessionToken } from '../utils/session'
import { requireAuth } from '../middleware/auth'

type LoginBody = {
  email?: string
  username?: string
  password?: string
}

export const authRoutes = new Hono()

authRoutes.post('/auth/login', async (c) => {
  try {
    const body = await parseJsonBody<LoginBody>(c)
    const emailOrUsername = (body.email ?? body.username ?? '').trim()
    const password = body.password ?? ''

    if (!emailOrUsername || !password) {
      return fail(c, 'Missing email/username or password', 400)
    }

    let user = await prisma.customUser.findFirst({
      where: {
        OR: [{ username: emailOrUsername }, { email: { equals: emailOrUsername, mode: 'insensitive' } }]
      }
    })

    if (!user && body.email) {
      user = await prisma.customUser.findFirst({
        where: { email: { equals: body.email, mode: 'insensitive' } }
      })
    }

    if (!user || !verifyDjangoPassword(password, user.password)) {
      return fail(c, 'Invalid email or password.', 401)
    }

    const token = await signSession({
      sub: String(user.id),
      username: user.username,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser
    })

    setSessionCookie(c, token)

    return ok(c, {
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_staff: user.is_staff,
        is_superuser: user.is_superuser
      }
    })
  } catch (error) {
    return fail(c, error instanceof Error ? error.message : 'Internal server error', 500)
  }
})

authRoutes.post('/auth/logout', async (c) => {
  clearSessionCookie(c)
  return ok(c, { message: 'Logged out' })
})

authRoutes.get('/auth/me', requireAuth, async (c) => {
  const user = c.get('user')
  return ok(c, { user })
})

authRoutes.get('/auth/session', async (c) => {
  const token = getSessionCookie(c)
  if (!token) {
    return ok(c, { authenticated: false })
  }

  const payload = await verifySessionToken(token)
  if (!payload) {
    clearSessionCookie(c)
    return ok(c, { authenticated: false })
  }

  return ok(c, { authenticated: true, session: payload })
})
