import type { BazarKey } from '@betting/shared'
import { BAZAR_CHOICES, BAZAR_NAMES } from '@betting/shared'

type Props = {
  open: boolean
  onClose: () => void
  currentBazar: BazarKey
  currentDate: string
  onChangeBazar: (value: BazarKey) => void
  onChangeDate: (value: string) => void
  username: string
  storage?: { used: number; total: number; percentage: number; databaseType: string }
  showAllBetTypes: boolean
  onToggleBetTypes: (value: boolean) => void
  voiceEnabled: boolean
  onToggleVoice: (value: boolean) => void
  onMasterDelete: () => void
  onDeleteBazar: () => void
  onLogout: () => void
}

const dateOptions = () => {
  const today = new Date()
  const options: Array<{ value: string; label: string; isToday: boolean }> = []

  for (let i = 30; i >= -7; i -= 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    options.push({
      value: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      isToday: i === 0
    })
  }

  return options
}

export function AppShellSidebar(props: Props) {
  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-[9998] transition-opacity ${props.open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={props.onClose} />
      <aside className={`fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-gradient-to-b from-white to-gray-50 shadow-2xl z-[9999] transition-transform ${props.open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 space-y-6 overflow-y-auto h-full">
          <div className="flex items-center justify-between border-b-2 border-indigo-200 pb-4">
            <h2 className="text-2xl font-bold text-indigo-700">Settings</h2>
            <button className="text-gray-500 hover:text-gray-800" onClick={props.onClose}>×</button>
          </div>

          <div className="space-y-3">
            <p className="text-lg font-bold text-gray-800">Select Bazar</p>
            <select
              className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg font-semibold bg-gradient-to-r from-indigo-50 to-blue-50"
              value={props.currentBazar}
              onChange={(event) => props.onChangeBazar(event.target.value as BazarKey)}
            >
              {BAZAR_CHOICES.map((choice) => (
                <option value={choice.value} key={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-600">
              Current: <span className="font-bold text-indigo-700">{BAZAR_NAMES[props.currentBazar]}</span>
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-lg font-bold text-gray-800">Select Date</p>
            <select
              className="w-full px-4 py-3 border-2 border-green-300 rounded-lg font-semibold bg-gradient-to-r from-green-50 to-teal-50"
              value={props.currentDate}
              onChange={(event) => props.onChangeDate(event.target.value)}
            >
              {dateOptions().map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
            <p className="text-gray-700 text-sm">Logged in as</p>
            <p className="text-xl font-bold text-indigo-700">{props.username}</p>
          </div>

          <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
            <p className="font-semibold text-blue-700 text-sm mb-2">Database Storage</p>
            <div className="flex justify-between text-xs mb-2">
              <span>
                {props.storage ? `${props.storage.used} MB / ${props.storage.total} MB` : 'Loading...'}
              </span>
              <span className="font-bold text-blue-700">{props.storage ? `${props.storage.percentage}%` : '--%'}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${props.storage?.percentage ?? 0}%` }} />
            </div>
            <p className="text-xs mt-2 text-gray-600">{props.storage?.databaseType ?? '-'}</p>
          </div>

          <ToggleCard title="Show All Bet Types" checked={props.showAllBetTypes} onChange={props.onToggleBetTypes} accent="indigo" />
          <ToggleCard title="Enable Voice Input" checked={props.voiceEnabled} onChange={props.onToggleVoice} accent="green" />

          <button className="w-full px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-rose-600 to-red-700" onClick={props.onMasterDelete}>
            Master Delete All Bets
          </button>
          <button className="w-full px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600" onClick={props.onDeleteBazar}>
            Delete Bazar Database
          </button>
          <button className="w-full px-6 py-3 rounded-lg font-bold text-white bg-gradient-to-r from-red-500 to-red-600" onClick={props.onLogout}>
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}

function ToggleCard({ title, checked, onChange, accent }: { title: string; checked: boolean; onChange: (value: boolean) => void; accent: 'indigo' | 'green' }) {
  const ring = accent === 'indigo' ? 'peer-checked:bg-indigo-600' : 'peer-checked:bg-green-600'
  const bg = accent === 'indigo' ? 'from-indigo-50 to-purple-50 border-indigo-200 text-indigo-700' : 'from-green-50 to-emerald-50 border-green-200 text-green-700'

  return (
    <div className={`p-4 rounded-lg border-2 bg-gradient-to-r ${bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{title}</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={checked} onChange={(event) => onChange(event.target.checked)} />
          <span className={`w-11 h-6 bg-gray-200 rounded-full after:content-[''] after:absolute after:left-[2px] after:top-[2px] after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-full ${ring}`} />
        </label>
      </div>
    </div>
  )
}
