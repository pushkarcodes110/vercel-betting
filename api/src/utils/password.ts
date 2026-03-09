import { pbkdf2Sync, timingSafeEqual } from 'node:crypto'

const DJANGO_PREFIX = 'pbkdf2_sha256'

const decodeBase64UrlSafe = (input: string): Buffer => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64')
}

export const verifyDjangoPassword = (rawPassword: string, encodedPassword: string): boolean => {
  if (!encodedPassword) return false

  if (encodedPassword.startsWith(`${DJANGO_PREFIX}$`)) {
    const [algorithm, iterationsStr, salt, hashB64] = encodedPassword.split('$')
    if (algorithm !== DJANGO_PREFIX || !iterationsStr || !salt || !hashB64) return false

    const iterations = Number.parseInt(iterationsStr, 10)
    if (Number.isNaN(iterations) || iterations <= 0) return false

    const derived = pbkdf2Sync(rawPassword, salt, iterations, 32, 'sha256')
    const target = decodeBase64UrlSafe(hashB64)

    return derived.length === target.length && timingSafeEqual(derived, target)
  }

  // For non-migrated users with plain PBKDF2 fallback formats, fail closed.
  return false
}
