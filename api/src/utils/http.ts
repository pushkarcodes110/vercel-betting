import type { Context } from 'hono'

export const ok = (c: Context, data: Record<string, unknown>, status = 200) => c.json({ success: true, ...data }, status as any)

export const fail = (c: Context, error: string, status = 400, extra?: Record<string, unknown>) =>
  c.json({ success: false, error, ...(extra ?? {}) }, status as any)

export const parseJsonBody = async <T>(c: Context): Promise<T> => {
  try {
    return (await c.req.json()) as T
  } catch {
    throw new Error('Invalid JSON')
  }
}

export const asNumber = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
