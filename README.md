# Betting App Migration Monorepo

This repository contains:

- `legacy-django/`: existing Django application (kept intact for parity checks and rollback)
- `web/`: Vite + React + TypeScript frontend
- `api/`: Hono + Vercel Functions + Prisma backend
- `shared/`: shared betting constants and types

## Local development

1. Install dependencies:
   - `npm install`
2. Configure environment files:
   - `cp api/.env.example api/.env`
   - `cp web/.env.example web/.env`
3. Run:
   - `npm run dev`

## Notes

- Existing DB schema compatibility is implemented via Prisma mappings to Django tables.
- Authentication supports Django `pbkdf2_sha256` password hashes.
- API is namespaced under `/api`.
