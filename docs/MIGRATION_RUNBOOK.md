# Migration Runbook: Django Postgres -> Vercel + Neon

## 1. Provision Neon

1. Create Neon project and database.
2. Copy connection string with SSL enabled.
3. Set `DATABASE_URL` for API deployment.

## 2. One-time data migration

Run from a machine that can access both source DB and Neon DB.

```bash
# Export from current production Postgres
pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --dbname="postgresql://<old_user>:<old_password>@<old_host>:5432/<old_db>" \
  --file=betting.dump

# Restore into Neon
pg_restore \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --dbname="postgresql://<new_user>:<new_password>@<new_host>/<new_db>?sslmode=require" \
  betting.dump
```

## 3. Prisma introspection

```bash
cd api
cp .env.example .env
# put Neon DATABASE_URL in .env
npm run prisma:pull
npm run prisma:generate
```

## 4. Verification checks

1. Verify table presence:
   - `userbaseapp_customuser`
   - `userbaseapp_bet`
   - `userbaseapp_bulkbetaction`
2. Verify row counts between source and Neon.
3. Verify a known user login with existing password hash.

## 5. Parallel-run validation

1. Keep Django app live.
2. Run React+Hono stack against Neon clone.
3. Execute parity checks for all critical API endpoints.
4. Compare random samples of bet totals and history outputs.

## 6. Cutover

1. Enable Vercel API and frontend production env vars.
2. Point production frontend traffic to Vercel.
3. Keep Django deployment available for rollback for at least 7 days.
