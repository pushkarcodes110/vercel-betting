# API Service (Hono + Prisma)

## Endpoints

- Auth: `/api/auth/*`
- Betting operations: `/api/*` (ported from Django)
- Admin operations: `/api/admin/*`

## Local

```bash
cd api
cp .env.example .env
npm install
npm run prisma:generate
npm run dev
```

## Notes

- Existing Django password hashes are validated in `src/utils/password.ts`.
- Prisma schema maps directly to existing Django table names.
