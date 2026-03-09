import type { BazarKey } from '@betting/shared'

export type SessionUser = {
  id: number
  username: string
  is_staff: boolean
  is_superuser: boolean
}

export type BetHistoryItem = {
  id: number
  amount: number
  created_at: string
  bet_type: string
  column: number | null
  sub_type: string | null
}

export type BetsMap = Record<string, { total: number; history: BetHistoryItem[] }>

export type BulkAction = {
  id: number
  type: string
  amount: string
  total_bets: number
  jodi_column: number | null
  jodi_type: number | null
  created_at: string
}

export type BetPayload = {
  number: string
  amount: number
  bazar: BazarKey
  date: string
}
