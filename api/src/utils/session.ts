import { SignJWT, jwtVerify } from 'jose'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { Context } from 'hono'
import { env, isProduction } from '../config/env'
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '../config/constants'

export type SessionPayload = {
  sub: string
  username: string
  is_staff: boolean
  is_superuser: boolean
}

const secret = new TextEncoder().encode(env.JWT_SECRET)

export const signSession = async (payload: SessionPayload): Promise<string> => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret)
}

export const verifySessionToken = async (token: string): Promise<SessionPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, secret)
    return {
      sub: String(payload.sub),
      username: String(payload.username),
      is_staff: Boolean(payload.is_staff),
      is_superuser: Boolean(payload.is_superuser)
    }
  } catch {
    return null
  }
}

export const setSessionCookie = (c: Context, token: string) => {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    domain: env.COOKIE_DOMAIN || undefined
  })
}

export const clearSessionCookie = (c: Context) => {
  deleteCookie(c, SESSION_COOKIE_NAME, {
    path: '/',
    domain: env.COOKIE_DOMAIN || undefined
  })
}

export const getSessionCookie = (c: Context): string | undefined => {
  return getCookie(c, SESSION_COOKIE_NAME)
}
