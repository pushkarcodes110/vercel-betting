import { useEffect, useMemo, useRef, useState } from 'react'

type QuickBet = { number: string; amount: number }

type Props = {
  open: boolean
  onClose: () => void
  onSubmitManual: (bets: QuickBet[]) => Promise<void>
  onSubmitVoice: (bets: QuickBet[]) => Promise<void>
  voiceEnabled: boolean
}

type Mode = 'manual' | 'voice' | 'bulk'

export function QuickBetPanel({ open, onClose, onSubmitManual, onSubmitVoice, voiceEnabled }: Props) {
  const [mode, setMode] = useState<Mode>('manual')
  const [manualRows, setManualRows] = useState<Array<{ number: string; amount: string }>>([{ number: '', amount: '10' }])
  const [voiceAmount, setVoiceAmount] = useState('10')
  const [voiceInput, setVoiceInput] = useState('')
  const [voiceLanguage, setVoiceLanguage] = useState('en-US')
  const [isVoiceListening, setIsVoiceListening] = useState(false)
  const [bulkInput, setBulkInput] = useState('')
  const recognitionRef = useRef<any | null>(null)
  const voiceSupported = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)

  const parsedVoiceNumbers = useMemo(() => {
    return Array.from(new Set(voiceInput.match(/\d{3}/g) ?? []))
  }, [voiceInput])

  useEffect(() => {
    if (!voiceSupported) return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = voiceLanguage

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript
      }
      setVoiceInput((prev) => `${prev} ${transcript}`.trim())
    }
    recognition.onend = () => setIsVoiceListening(false)
    recognition.onerror = () => setIsVoiceListening(false)
    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [voiceLanguage, voiceSupported])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-20 bg-black/30">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl border-2 border-indigo-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-indigo-700">Quick Bet Entry</h3>
          <button className="text-gray-500 hover:text-gray-800" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <ModeButton mode={mode} target="manual" label="Manual" onClick={setMode} />
          <ModeButton mode={mode} target="voice" label="Voice" onClick={setMode} disabled={!voiceEnabled} />
          <ModeButton mode={mode} target="bulk" label="Bulk Paste" onClick={setMode} />
        </div>

        {mode === 'manual' ? (
          <div className="space-y-2">
            {manualRows.map((row, index) => (
              <div className="grid grid-cols-12 gap-2" key={index}>
                <input
                  className="col-span-5 px-3 py-2 border rounded-lg"
                  placeholder="Number (3 digits)"
                  value={row.number}
                  onChange={(event) => {
                    const copy = [...manualRows]
                    copy[index] = { ...copy[index], number: event.target.value }
                    setManualRows(copy)
                  }}
                />
                <input
                  className="col-span-5 px-3 py-2 border rounded-lg"
                  placeholder="Amount"
                  value={row.amount}
                  onChange={(event) => {
                    const copy = [...manualRows]
                    copy[index] = { ...copy[index], amount: event.target.value }
                    setManualRows(copy)
                  }}
                />
                <button
                  className="col-span-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg"
                  onClick={() => setManualRows((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                  disabled={manualRows.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-lg border" onClick={() => setManualRows((prev) => [...prev, { number: '', amount: '10' }])}>
                Add Row
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
                onClick={async () => {
                  const payload = manualRows
                    .map((item) => ({ number: item.number.trim(), amount: Number(item.amount) }))
                    .filter((item) => /^\d{1,3}$/.test(item.number) && item.amount > 0)
                    .map((item) => ({ ...item, number: item.number.padStart(3, '0') }))
                  await onSubmitManual(payload)
                }}
              >
                Place Bets
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'voice' ? (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <select className="px-3 py-2 border rounded-lg" value={voiceLanguage} onChange={(event) => setVoiceLanguage(event.target.value)}>
                <option value="en-US">English (US)</option>
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi</option>
              </select>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                disabled={!voiceEnabled || !voiceSupported || isVoiceListening}
                onClick={() => {
                  recognitionRef.current?.start()
                  setIsVoiceListening(true)
                }}
              >
                Start Listening
              </button>
              <button
                className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50"
                disabled={!isVoiceListening}
                onClick={() => {
                  recognitionRef.current?.stop()
                  setIsVoiceListening(false)
                }}
              >
                Stop
              </button>
            </div>
            {!voiceSupported ? <p className="text-sm text-red-600">Voice input is not supported in this browser.</p> : null}
            <textarea
              className="w-full min-h-28 border rounded-lg p-3"
              placeholder="Voice transcript input (paste/type or use Start Listening). 3-digit numbers will be auto-detected."
              value={voiceInput}
              onChange={(event) => setVoiceInput(event.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              {parsedVoiceNumbers.map((number) => (
                <span key={number} className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                  {number}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="px-3 py-2 border rounded-lg" value={voiceAmount} onChange={(event) => setVoiceAmount(event.target.value)} placeholder="Amount" />
              <button
                className="px-4 py-2 bg-green-600 text-white rounded-lg"
                onClick={async () => {
                  const amount = Number(voiceAmount)
                  if (!amount || amount <= 0) return
                  await onSubmitVoice(parsedVoiceNumbers.map((number) => ({ number, amount })))
                }}
              >
                Place Voice Bets
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'bulk' ? (
          <div className="space-y-3">
            <textarea
              className="w-full min-h-36 border rounded-lg p-3 font-mono text-sm"
              placeholder={'Paste lines like: 123 50\\n456 100'}
              value={bulkInput}
              onChange={(event) => setBulkInput(event.target.value)}
            />
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              onClick={async () => {
                const bets = bulkInput
                  .split(/\n+/)
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const [number, amount] = line.split(/\s+/)
                    return { number: number?.padStart(3, '0'), amount: Number(amount) }
                  })
                  .filter((item) => /^\d{3}$/.test(item.number ?? '') && item.amount > 0)
                await onSubmitManual(bets as QuickBet[])
              }}
            >
              Parse and Place
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ModeButton({ mode, target, label, onClick, disabled = false }: { mode: Mode; target: Mode; label: string; onClick: (mode: Mode) => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onClick(target)}
      className={`px-4 py-2 rounded-lg border ${mode === target ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-700 border-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {label}
    </button>
  )
}
