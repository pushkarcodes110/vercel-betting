# Environment Variables

## API (`api` project on Vercel)

- `DATABASE_URL` = Neon Postgres URL with SSL
- `JWT_SECRET` = long random secret
- `COOKIE_DOMAIN` = production root domain (optional)
- `NODE_ENV` = `production`

## Web (`web` project on Vercel)

- `VITE_API_BASE` = API base URL (for same domain use `/api`, for split domain use full URL)

## Local development

- `api/.env`
- `web/.env`
