import { useState } from 'react'

export function MasterDeleteModal({ open, onClose, onConfirm, totalCount }: { open: boolean; onClose: () => void; onConfirm: (password: string) => Promise<void>; totalCount: number }) {
  const [checked, setChecked] = useState(false)
  const [password, setPassword] = useState('')

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/75 z-[100000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-md w-full bg-white rounded-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-6 rounded-t-2xl">
          <h3 className="text-2xl font-bold">Master Delete Warning</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-red-700">This will permanently delete all bets. This action cannot be undone.</p>
          <p>Total bets to be deleted: <span className="font-bold text-red-600">{totalCount}</span></p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
            I understand this is permanent.
          </label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={!checked}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Your account password"
          />
          <div className="flex gap-2">
            <button className="flex-1 px-4 py-2 rounded-lg bg-gray-200" onClick={onClose}>Cancel</button>
            <button
              className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-700 text-white disabled:opacity-50"
              disabled={!checked || !password}
              onClick={() => onConfirm(password)}
            >
              Delete All Bets
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
