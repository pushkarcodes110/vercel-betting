import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BAZAR_NAMES, type BazarKey } from '@betting/shared'
import { API } from '@/api/client'
import { useSession } from '@/hooks/useSession'
import { useToast } from '@/hooks/useToast'
import { AppShellSidebar } from '@/components/AppShellSidebar'
import { LoaderOverlay } from '@/components/LoaderOverlay'
import { SpreadsheetGrid } from '@/components/SpreadsheetGrid'
import { UniversalBetModal } from '@/components/UniversalBetModal'
import { QuickBetPanel } from '@/components/QuickBetPanel'
import { HistoryModal } from '@/components/HistoryModal'
import { MasterDeleteModal } from '@/components/MasterDeleteModal'
import { BazarDeleteModal } from '@/components/BazarDeleteModal'

type ModalState = {
  open: boolean
  title: string
  betType: string | null
  number?: string
}

export function HomePage() {
  const navigate = useNavigate()
  const { user, logout } = useSession()
  const { showToast } = useToast()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickBetOpen, setQuickBetOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [masterDeleteOpen, setMasterDeleteOpen] = useState(false)
  const [bazarDeleteOpen, setBazarDeleteOpen] = useState(false)

  const [loading, setLoading] = useState(false)
  const [loaderText, setLoaderText] = useState('Loading...')

  const [currentBazar, setCurrentBazar] = useState<BazarKey>((localStorage.getItem('selectedBazar') as BazarKey) || 'SRIDEVI_OPEN')
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [showAllBetTypes, setShowAllBetTypes] = useState(localStorage.getItem('showAllBetTypes') !== 'false')
  const [voiceEnabled, setVoiceEnabled] = useState(localStorage.getItem('voiceEnabled') !== 'false')
  const [spAmountLimit, setSpAmountLimit] = useState(localStorage.getItem('spAmountLimit') ?? '')
  const [dpAmountLimit, setDpAmountLimit] = useState(localStorage.getItem('dpAmountLimit') ?? '')

  const [modalState, setModalState] = useState<ModalState>({ open: false, title: '', betType: null })
  const [currentPage, setCurrentPage] = useState(1)

  const [bets, setBets] = useState<Record<string, { total: number; history: Array<any> }>>({})
  const [allTotals, setAllTotals] = useState<Record<string, number>>({})
  const [history, setHistory] = useState<Array<any>>([])
  const [lastBulkAction, setLastBulkAction] = useState<any | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [storage, setStorage] = useState<{ used: number; total: number; percentage: number; databaseType: string } | undefined>()
  const [totalBetCount, setTotalBetCount] = useState(0)

  const displayTotal = useMemo(() => totalAmount.toFixed(2), [totalAmount])

  const runWithLoader = async (text: string, callback: () => Promise<void>) => {
    setLoaderText(text)
    setLoading(true)
    try {
      await callback()
    } finally {
      setLoading(false)
    }
  }

  const loadCoreData = async () => {
    const [betsData, totalsData, totalData, historyData, storageData, bulkData, countData] = await Promise.all([
      API.loadBets(currentBazar, currentDate),
      API.getAllTotals(currentBazar, currentDate),
      API.getTotal(currentBazar, currentDate),
      API.getBulkHistory(currentBazar, currentDate),
      API.getStorage(),
      API.getLastBulk(currentBazar, currentDate),
      API.getTotalBetCount()
    ])

    setBets(betsData.bets)
    setAllTotals(totalsData.bet_totals)
    setTotalAmount(totalData.total_amount)
    setHistory(historyData.history)
    setStorage({
      used: storageData.storage_used_mb,
      total: storageData.storage_total_mb,
      percentage: storageData.percentage,
      databaseType: storageData.database_type
    })
    setLastBulkAction(bulkData.has_action ? bulkData.action : null)
    setTotalBetCount(countData.total_count)
  }

  useEffect(() => {
    void runWithLoader('Loading dashboard...', loadCoreData)
  }, [currentBazar, currentDate])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadCoreData().catch(() => undefined)
    }, 15000)
    return () => window.clearInterval(interval)
  }, [currentBazar, currentDate])

  const openModal = (betType: string, number?: string) => {
    const title = number ? `Place a Bet on ${number}` : `Place ${betType} Bet`
    setModalState({ open: true, title, betType, number })
  }

  const closeModal = () => {
    setModalState({ open: false, title: '', betType: null })
  }

  const handleSubmitModal = async (payload: Record<string, unknown>) => {
    await runWithLoader('Placing bet...', async () => {
      if (modalState.betType === 'SINGLE') {
        await API.placeBet({ ...payload, bazar: currentBazar, date: currentDate })
      } else if (modalState.betType === 'MOTAR') {
        await API.placeMotar({ ...payload, bazar: currentBazar, date: currentDate })
      } else if (modalState.betType === 'COMMAN_PANA') {
        await API.placeCommanPana({ ...payload, bazar: currentBazar, date: currentDate })
      } else if (modalState.betType === 'SET_PANA') {
        await API.placeSetPana({ ...payload, bazar: currentBazar, date: currentDate })
      } else if (modalState.betType === 'GROUP') {
        await API.placeGroup({ ...payload, bazar: currentBazar, date: currentDate })
      } else if (modalState.betType === 'COLUMN') {
        await API.placeColumnBet({ ...payload, bazar: currentBazar, date: currentDate })
      } else if (modalState.betType === 'EKI_BEKI') {
        await API.placeBulkBet({ type: 'EKI', amount: payload.amount, bazar: currentBazar, date: currentDate })
      } else {
        await API.placeBulkBet({ ...payload, bazar: currentBazar, date: currentDate })
      }

      await loadCoreData()
      showToast('Success', 'Bet placed successfully', 'success')
      closeModal()
    })
  }

  const handleQuickSubmit = async (items: Array<{ number: string; amount: number }>) => {
    await runWithLoader('Placing quick bets...', async () => {
      await API.placeQuickBets({ bets: items, bazar: currentBazar, date: currentDate })
      await loadCoreData()
      showToast('Success', `${items.length} quick bets placed`, 'success')
    })
  }

  const handleDeleteBet = async (id: number) => {
    await runWithLoader('Deleting bet...', async () => {
      await API.deleteBet(id)
      await loadCoreData()
      showToast('Success', 'Bet deleted', 'success')
    })
  }

  const handleUndoBulk = async (id?: number) => {
    if (!id && !lastBulkAction?.id) return
    await runWithLoader('Undoing bulk action...', async () => {
      await API.undoBulk(Number(id ?? lastBulkAction.id))
      await loadCoreData()
      showToast('Success', 'Bulk action undone', 'success')
    })
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      <LoaderOverlay active={loading} text={loaderText} />

      <AppShellSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentBazar={currentBazar}
        currentDate={currentDate}
        onChangeBazar={(value) => {
          localStorage.setItem('selectedBazar', value)
          setCurrentBazar(value)
        }}
        onChangeDate={setCurrentDate}
        username={user?.username ?? 'User'}
        storage={storage}
        showAllBetTypes={showAllBetTypes}
        onToggleBetTypes={(value) => {
          setShowAllBetTypes(value)
          localStorage.setItem('showAllBetTypes', String(value))
        }}
        voiceEnabled={voiceEnabled}
        onToggleVoice={(value) => {
          setVoiceEnabled(value)
          localStorage.setItem('voiceEnabled', String(value))
        }}
        onMasterDelete={() => setMasterDeleteOpen(true)}
        onDeleteBazar={() => setBazarDeleteOpen(true)}
        onLogout={async () => {
          await logout()
          navigate('/')
        }}
      />

      <div className="mb-6 bg-white rounded-xl shadow-lg p-4 border-2 border-indigo-200 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg border-2 border-indigo-300 shadow-sm">
            <span className="text-xs font-medium text-indigo-600">Bazar</span>
            <p className="text-sm font-bold text-indigo-800">{BAZAR_NAMES[currentBazar]}</p>
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-green-100 to-teal-100 rounded-lg border-2 border-green-300 shadow-sm">
            <span className="text-xs font-medium text-green-600">Date</span>
            <p className="text-sm font-bold text-green-800">{currentDate}</p>
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border-2 border-yellow-300 shadow-sm">
            <span className="text-xs font-medium text-yellow-600">Count</span>
            <p className="text-lg font-bold text-orange-700">₹{displayTotal}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.is_staff || user?.is_superuser ? (
            <button className="px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700" onClick={() => navigate('/admin')}>
              Admin
            </button>
          ) : null}
          <button className="px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700" onClick={() => setHistoryOpen(true)}>
            History
          </button>
          <button className="px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700" onClick={() => setQuickBetOpen(true)}>
            Quick Bet
          </button>
          <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white" onClick={() => setSidebarOpen(true)}>
            Settings
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {showAllBetTypes ? (
          ['SP', 'DP', 'JODI', 'EKI_BEKI', 'ABR_CUT', 'JODI_PANEL', 'MOTAR', 'COMMAN_PANA', 'SET_PANA', 'GROUP', 'COLUMN'].map((type) => (
            <button key={type} className="px-3 py-2 bg-white rounded-lg border border-gray-300 text-sm font-medium" onClick={() => openModal(type)}>
              {type}
            </button>
          ))
        ) : null}
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-300 rounded-lg p-3">
          <label className="block text-xs text-gray-600 mb-1">SP Amount Limit</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={spAmountLimit}
            placeholder="Set limit for highlighting"
            onChange={(event) => {
              const value = event.target.value
              setSpAmountLimit(value)
              if (value.trim()) localStorage.setItem('spAmountLimit', value)
              else localStorage.removeItem('spAmountLimit')
            }}
          />
        </div>
        <div className="bg-white border border-gray-300 rounded-lg p-3">
          <label className="block text-xs text-gray-600 mb-1">DP Amount Limit</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={dpAmountLimit}
            placeholder="Set limit for highlighting"
            onChange={(event) => {
              const value = event.target.value
              setDpAmountLimit(value)
              if (value.trim()) localStorage.setItem('dpAmountLimit', value)
              else localStorage.removeItem('dpAmountLimit')
            }}
          />
        </div>
      </div>

      <SpreadsheetGrid totals={allTotals} onOpenBetModal={openModal} currentPage={currentPage} onPageChange={setCurrentPage} />

      <div className="mt-4 flex items-center gap-2">
        <button
          className="px-4 py-2 rounded-lg bg-red-500 text-white disabled:opacity-50"
          disabled={!lastBulkAction}
          onClick={() => void handleUndoBulk()}
        >
          Undo Last Action
        </button>
        <span className="text-sm text-gray-600">Total bet count: {totalBetCount}</span>
      </div>

      <UniversalBetModal
        open={modalState.open}
        title={modalState.title}
        betType={modalState.betType}
        number={modalState.number}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />

      <QuickBetPanel
        open={quickBetOpen}
        onClose={() => setQuickBetOpen(false)}
        onSubmitManual={handleQuickSubmit}
        onSubmitVoice={handleQuickSubmit}
        voiceEnabled={voiceEnabled}
      />

      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        records={history}
        onDeleteBet={(id) => handleDeleteBet(id)}
        onUndoBulk={(id) => handleUndoBulk(id)}
      />

      <MasterDeleteModal
        open={masterDeleteOpen}
        onClose={() => setMasterDeleteOpen(false)}
        totalCount={totalBetCount}
        onConfirm={async (password) => {
          await runWithLoader('Deleting all bets...', async () => {
            await API.masterDelete(password)
            await loadCoreData()
            setMasterDeleteOpen(false)
            showToast('Success', 'All bets deleted', 'success')
          })
        }}
      />

      <BazarDeleteModal
        open={bazarDeleteOpen}
        onClose={() => setBazarDeleteOpen(false)}
        bazar={currentBazar}
        date={currentDate}
        count={Object.values(bets).reduce((sum, item) => sum + item.history.length, 0)}
        onConfirm={async () => {
          await runWithLoader('Deleting bazar data...', async () => {
            await API.deleteBazar(currentBazar, currentDate)
            await loadCoreData()
            setBazarDeleteOpen(false)
            showToast('Success', 'Bazar data deleted', 'success')
          })
        }}
      />
    </div>
  )
}
