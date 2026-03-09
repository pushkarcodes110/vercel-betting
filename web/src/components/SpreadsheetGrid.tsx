import { ALL_COLUMN_DATA, ROW_LABELS } from '@betting/shared'

type Props = {
  totals: Record<string, number>
  onOpenBetModal: (betType: string, number?: string) => void
  currentPage: number
  onPageChange: (page: number) => void
}

const pageButtons = [
  { label: 'All SP', page: 1 },
  { label: 'All DP', page: 2 },
  { label: 'Jodi', page: 3 },
  { label: 'Eki/Beki', page: 4 },
  { label: 'ABR Cut', page: 5 },
  { label: 'Jodi Panel', page: 6 },
  { label: 'Motar', page: 7 },
  { label: 'Comman Pana', page: 8 },
  { label: 'Set Pana', page: 9 },
  { label: 'Group', page: 10 },
  { label: 'Column', page: 11 }
]

export function SpreadsheetGrid({ totals, onOpenBetModal, currentPage, onPageChange }: Props) {
  return (
    <div className="bg-white rounded-xl border-2 border-indigo-200 shadow-lg p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {pageButtons.map((item) => (
          <button
            key={item.page}
            onClick={() => {
              onPageChange(item.page)
              if (item.page === 1) onOpenBetModal('SP')
              if (item.page === 2) onOpenBetModal('DP')
            }}
            className={`px-3 py-2 text-sm rounded-lg border ${currentPage === item.page ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-700 border-gray-300'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-auto border border-gray-300 rounded-lg">
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="spreadsheet-cell header-cell">#</th>
              {Array.from({ length: 10 }, (_, idx) => (
                <th className="spreadsheet-cell header-cell border-b-2 border-gray-300" key={idx + 1}>
                  Col {idx + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_LABELS.map((rowLabel, rowIndex) => (
              <tr key={rowLabel} className="data-row border-b border-gray-200">
                <td className="spreadsheet-cell row-number-cell">{rowLabel}</td>
                {ALL_COLUMN_DATA.map((column, colIndex) => {
                  const raw = column[rowIndex]
                  const number = String(raw).padStart(3, '0')
                  const total = totals[number] ?? 0

                  return (
                    <td key={`${rowLabel}-${colIndex}`} className="spreadsheet-cell text-gray-700">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{number}</span>
                        <button className="text-xs px-2 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => onOpenBetModal('SINGLE', number)}>
                          Bet
                        </button>
                      </div>
                      <p className="text-xs mt-1 text-gray-500">₹{total.toFixed(2)}</p>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
