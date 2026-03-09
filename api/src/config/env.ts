export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN ?? '',
  NODE_ENV: process.env.NODE_ENV ?? 'development'
}

export const isProduction = env.NODE_ENV === 'production'
