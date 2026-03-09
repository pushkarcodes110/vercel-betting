const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

type RequestOptions = RequestInit & {
  query?: Record<string, string | number | undefined>
}

const buildUrl = (path: string, query?: RequestOptions['query']) => {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value != null) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return `${url.pathname}${url.search}`
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(buildUrl(path, options.query), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    ...options
  })

  const json = (await response.json()) as T & { success?: boolean; error?: string }
  if (!response.ok || json.success === false) {
    throw new Error(json.error ?? `Request failed: ${response.status}`)
  }

  return json as T
}

export const API = {
  login: (email: string, password: string) =>
    apiRequest<{ user: { id: number; username: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  me: () => apiRequest<{ user: { id: number; username: string; is_staff: boolean; is_superuser: boolean } }>('/auth/me'),
  loadBets: (bazar: string, date: string) => apiRequest<{ bets: Record<string, { total: number; history: Array<any> }> }>('/load-bets', { query: { bazar, date } }),
  getTotal: (bazar: string, date: string) => apiRequest<{ total_amount: number }>('/get-bet-total', { query: { bazar, date } }),
  getAllTotals: (bazar: string, date: string) => apiRequest<{ bet_totals: Record<string, number> }>('/get-all-bet-totals', { query: { bazar, date } }),
  placeBet: (payload: Record<string, unknown>) => apiRequest('/place-bet', { method: 'POST', body: JSON.stringify(payload) }),
  placeBulkBet: (payload: Record<string, unknown>) => apiRequest('/place-bulk-bet', { method: 'POST', body: JSON.stringify(payload) }),
  deleteBet: (betId: number) => apiRequest('/delete-bet', { method: 'POST', body: JSON.stringify({ bet_id: betId }) }),
  undoBulk: (bulkActionId: number) => apiRequest('/undo-bulk-action', { method: 'POST', body: JSON.stringify({ bulk_action_id: bulkActionId }) }),
  getLastBulk: (bazar: string, date: string) => apiRequest<{ has_action: boolean; action?: any }>('/get-last-bulk-action', { query: { bazar, date } }),
  getBulkHistory: (bazar: string, date: string) => apiRequest<{ history: Array<any> }>('/get-bulk-action-history', { query: { bazar, date } }),
  generateMotar: (digits: string) => apiRequest<{ numbers: string[]; count: number }>('/generate-motar-numbers', { method: 'POST', body: JSON.stringify({ digits }) }),
  findCommanPana: (digit: string, type: '36' | '56') => apiRequest<{ numbers: string[]; count: number }>('/find-comman-pana-numbers', { method: 'POST', body: JSON.stringify({ digit, type }) }),
  placeMotar: (payload: Record<string, unknown>) => apiRequest('/place-motar-bet', { method: 'POST', body: JSON.stringify(payload) }),
  placeCommanPana: (payload: Record<string, unknown>) => apiRequest('/place-comman-pana-bet', { method: 'POST', body: JSON.stringify(payload) }),
  placeSetPana: (payload: Record<string, unknown>) => apiRequest('/place-set-pana-bet', { method: 'POST', body: JSON.stringify(payload) }),
  placeGroup: (payload: Record<string, unknown>) => apiRequest('/place-group-bet', { method: 'POST', body: JSON.stringify(payload) }),
  placeColumnBet: (payload: Record<string, unknown>) => apiRequest('/place-column-bet', { method: 'POST', body: JSON.stringify(payload) }),
  getColumnTotals: (bazar: string, date: string) => apiRequest<{ column_totals: Record<number, number> }>('/get-column-totals', { query: { bazar, date } }),
  placeQuickBets: (payload: Record<string, unknown>) => apiRequest('/place-quick-bets', { method: 'POST', body: JSON.stringify(payload) }),
  getStorage: () => apiRequest<{ storage_used_mb: number; storage_total_mb: number; percentage: number; database_type: string }>('/get-database-storage'),
  masterDelete: (password: string) => apiRequest<{ deleted_count: number }>('/master-delete-all-bets', { method: 'POST', body: JSON.stringify({ password }) }),
  deleteBazar: (bazar: string, date: string) => apiRequest<{ deleted_count: number }>('/delete-bazar-bets', { method: 'POST', body: JSON.stringify({ bazar, date }) }),
  getTotalBetCount: () => apiRequest<{ total_count: number }>('/get-total-bet-count'),
  adminUsers: (search = '') => apiRequest<{ users: Array<any> }>('/admin/users', { query: { search } }),
  adminBets: (search = '') => apiRequest<{ bets: Array<any> }>('/admin/bets', { query: { search } }),
  adminBulkActions: (search = '') => apiRequest<{ actions: Array<any> }>('/admin/bulk-actions', { query: { search } }),
  adminUndoBulkAction: (id: number) => apiRequest('/admin/bulk-actions/' + id + '/undo', { method: 'POST' }),
  adminSoftDeleteBet: (id: number) => apiRequest('/admin/bets/' + id + '/soft-delete', { method: 'POST' })
}
