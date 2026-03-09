import { useMemo, useState } from 'react'

type Props = {
  open: boolean
  title: string
  betType: string | null
  number?: string | null
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}

export function UniversalBetModal({ open, title, betType, number, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState('10')
  const [columns, setColumns] = useState<number[]>([])
  const [jodiType, setJodiType] = useState('12')
  const [panelType, setPanelType] = useState('9')
  const [digit, setDigit] = useState('5')
  const [digits, setDigits] = useState('4789')
  const [setPanaNumber, setSetPanaNumber] = useState('115')
  const [groupInput, setGroupInput] = useState('35')
  const [ekiBekiType, setEkiBekiType] = useState<'EKI' | 'BEKI' | 'DADAR'>('EKI')

  const parsedAmount = useMemo(() => Number(amount), [amount])

  if (!open || !betType) return null

  const submit = async () => {
    if (!parsedAmount || parsedAmount <= 0) return

    if (betType === 'SINGLE' && number) {
      await onSubmit({ number, amount: parsedAmount })
      return
    }

    if (['SP', 'DP'].includes(betType)) {
      await onSubmit({ type: betType, amount: parsedAmount, columns: columns.length ? columns : undefined })
      return
    }

    if (betType === 'JODI') {
      await onSubmit({ type: 'JODI', amount: parsedAmount, columns, jodi_type: Number(jodiType) })
      return
    }

    if (betType === 'ABR_CUT') {
      await onSubmit({ type: 'ABR_CUT', amount: parsedAmount, columns })
      return
    }

    if (betType === 'JODI_PANEL') {
      await onSubmit({ type: 'JODI_PANEL', amount: parsedAmount, columns, panel_type: Number(panelType) })
      return
    }

    if (betType === 'MOTAR') {
      await onSubmit({ digits, amount: parsedAmount })
      return
    }

    if (betType === 'COMMAN_PANA') {
      await onSubmit({ digit, type: '36', amount: parsedAmount })
      return
    }

    if (betType === 'SET_PANA') {
      await onSubmit({ number: setPanaNumber, amount: parsedAmount })
      return
    }

    if (betType === 'GROUP') {
      const [d1, d2] = groupInput.split('').map((item) => Number(item))
      await onSubmit({ digit1: d1, digit2: d2, amount: parsedAmount })
      return
    }

    if (betType === 'COLUMN') {
      await onSubmit({ column: Number(groupInput.slice(0, 1) || '1'), amount: parsedAmount })
      return
    }

    if (betType === 'EKI_BEKI') {
      await onSubmit({ type: ekiBekiType, amount: parsedAmount })
    }
  }

  return (
    <div className="fixed inset-0 z-[100000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-indigo-700">{title}</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <label className="block text-sm font-medium">Amount</label>
          <input className="w-full border rounded-lg px-3 py-2" value={amount} onChange={(event) => setAmount(event.target.value)} />

          {['SP', 'DP', 'JODI', 'ABR_CUT', 'JODI_PANEL'].includes(betType) ? (
            <div>
              <p className="text-sm font-medium mb-2">Columns</p>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }, (_, idx) => idx + 1).map((col) => (
                  <label key={col} className="border rounded-lg px-2 py-1 text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={columns.includes(col)}
                      onChange={(event) => {
                        setColumns((prev) => (event.target.checked ? [...prev, col] : prev.filter((item) => item !== col)))
                      }}
                    />
                    Col {col}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {betType === 'JODI' ? (
            <select className="w-full border rounded-lg px-3 py-2" value={jodiType} onChange={(event) => setJodiType(event.target.value)}>
              <option value="5">5</option>
              <option value="7">7</option>
              <option value="12">12</option>
            </select>
          ) : null}

          {betType === 'JODI_PANEL' ? (
            <select className="w-full border rounded-lg px-3 py-2" value={panelType} onChange={(event) => setPanelType(event.target.value)}>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="9">9</option>
            </select>
          ) : null}

          {betType === 'MOTAR' ? <input className="w-full border rounded-lg px-3 py-2" value={digits} onChange={(event) => setDigits(event.target.value)} /> : null}
          {betType === 'COMMAN_PANA' ? <input className="w-full border rounded-lg px-3 py-2" value={digit} onChange={(event) => setDigit(event.target.value)} /> : null}
          {betType === 'SET_PANA' ? <input className="w-full border rounded-lg px-3 py-2" value={setPanaNumber} onChange={(event) => setSetPanaNumber(event.target.value)} /> : null}
          {betType === 'GROUP' ? <input className="w-full border rounded-lg px-3 py-2" value={groupInput} onChange={(event) => setGroupInput(event.target.value)} /> : null}
          {betType === 'EKI_BEKI' ? (
            <select className="w-full border rounded-lg px-3 py-2" value={ekiBekiType} onChange={(event) => setEkiBekiType(event.target.value as 'EKI' | 'BEKI' | 'DADAR')}>
              <option value="EKI">EKI</option>
              <option value="BEKI">BEKI</option>
              <option value="DADAR">DADAR</option>
            </select>
          ) : null}

          <div className="pt-2 flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-gray-200" onClick={onClose}>
              Cancel
            </button>
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white" onClick={submit}>
              Place Bet
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
