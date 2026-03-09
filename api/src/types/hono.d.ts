import 'hono'

declare module 'hono' {
  interface ContextVariableMap {
    user: {
      id: number
      username: string
      is_staff: boolean
      is_superuser: boolean
    }
  }
}
