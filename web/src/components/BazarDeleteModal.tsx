import { BAZAR_NAMES } from '@betting/shared'
import type { BazarKey } from '@betting/shared'
import { useState } from 'react'

export function BazarDeleteModal({ open, onClose, bazar, date, count, onConfirm }: { open: boolean; onClose: () => void; bazar: BazarKey; date: string; count: number; onConfirm: () => Promise<void> }) {
  const [checked, setChecked] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/75 z-[100000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-md w-full bg-white rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-6 rounded-t-2xl">
          <h3 className="text-2xl font-bold">Delete Bazar Data</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-orange-700">This will permanently delete bets for selected bazar/date.</p>
          <p className="text-sm"><strong>Bazar:</strong> {BAZAR_NAMES[bazar]}</p>
          <p className="text-sm"><strong>Date:</strong> {date}</p>
          <p className="text-sm"><strong>Total bets:</strong> {count}</p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
            I understand this is permanent.
          </label>
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 rounded-lg bg-gray-200" onClick={onClose}>Cancel</button>
            <button className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 text-white disabled:opacity-50" disabled={!checked} onClick={onConfirm}>
              Delete Bazar Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
