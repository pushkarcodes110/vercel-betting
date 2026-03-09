import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth'
import { bettingRoutes } from './routes/betting'
import { adminRoutes } from './routes/admin'

export const app = new Hono({ strict: false }).basePath('/api')

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin) => origin,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  })
)

app.route('/', authRoutes)
app.route('/', bettingRoutes)
app.route('/', adminRoutes)

app.get('/health', (c) => c.json({ ok: true, service: 'betting-api' }))

app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404))

app.onError((error, c) => {
  console.error(error)
  return c.json({ success: false, error: 'Internal server error' }, 500)
})
