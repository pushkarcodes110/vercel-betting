export function HistoryModal({ open, onClose, records, onDeleteBet, onUndoBulk }: { open: boolean; onClose: () => void; records: Array<any>; onDeleteBet: (id: number) => Promise<void>; onUndoBulk: (id: number) => Promise<void> }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-gray-900/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-indigo-700">Bulk Action History</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">Type</th>
                <th className="border px-3 py-2">Amount</th>
                <th className="border px-3 py-2">Bets</th>
                <th className="border px-3 py-2">Bazar</th>
                <th className="border px-3 py-2">Date</th>
                <th className="border px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="border px-3 py-2">{record.action_type ?? record.bet_type}</td>
                  <td className="border px-3 py-2">₹{record.amount}</td>
                  <td className="border px-3 py-2">{record.total_bets ?? '-'}</td>
                  <td className="border px-3 py-2">{record.bazar ?? '-'}</td>
                  <td className="border px-3 py-2">{record.created_at}</td>
                  <td className="border px-3 py-2">
                    {'action_type' in record ? (
                      <button className="px-3 py-1 bg-red-500 text-white rounded" disabled={record.is_undone} onClick={() => onUndoBulk(record.id)}>
                        Undo
                      </button>
                    ) : (
                      <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={() => onDeleteBet(record.id)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
