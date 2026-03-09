import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { API } from '@/api/client'
import { useSession } from '@/hooks/useSession'
import { useToast } from '@/hooks/useToast'
import { LoaderOverlay } from '@/components/LoaderOverlay'

type Tab = 'users' | 'bets' | 'actions'

export function AdminPage() {
  const navigate = useNavigate()
  const { logout } = useSession()
  const { showToast } = useToast()

  const [tab, setTab] = useState<Tab>('users')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const [users, setUsers] = useState<Array<any>>([])
  const [bets, setBets] = useState<Array<any>>([])
  const [actions, setActions] = useState<Array<any>>([])

  const load = async () => {
    setLoading(true)
    try {
      if (tab === 'users') {
        const data = await API.adminUsers(search)
        setUsers(data.users)
      }
      if (tab === 'bets') {
        const data = await API.adminBets(search)
        setBets(data.bets)
      }
      if (tab === 'actions') {
        const data = await API.adminBulkActions(search)
        setActions(data.actions)
      }
    } catch (error) {
      showToast('Error', error instanceof Error ? error.message : 'Failed to load admin data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [tab])

  return (
    <div className="max-w-7xl mx-auto p-6">
      <LoaderOverlay active={loading} text="Loading admin data..." />

      <div className="bg-white rounded-xl border-2 border-indigo-200 shadow-lg p-4 mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-indigo-700">Admin Dashboard</h1>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg border" onClick={() => navigate('/home')}>
            Back Home
          </button>
          <button
            className="px-3 py-2 rounded-lg bg-red-600 text-white"
            onClick={async () => {
              await logout()
              navigate('/')
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-indigo-200 shadow-lg p-4 mb-4 flex items-center gap-2">
        <button className={`px-3 py-2 rounded-lg ${tab === 'users' ? 'bg-indigo-600 text-white' : 'border'}`} onClick={() => setTab('users')}>
          Users
        </button>
        <button className={`px-3 py-2 rounded-lg ${tab === 'bets' ? 'bg-indigo-600 text-white' : 'border'}`} onClick={() => setTab('bets')}>
          Bets
        </button>
        <button className={`px-3 py-2 rounded-lg ${tab === 'actions' ? 'bg-indigo-600 text-white' : 'border'}`} onClick={() => setTab('actions')}>
          Bulk Actions
        </button>

        <input className="ml-auto border rounded-lg px-3 py-2" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <button className="px-3 py-2 rounded-lg border" onClick={() => void load()}>
          Search
        </button>
      </div>

      {tab === 'users' ? <UsersTable users={users} /> : null}
      {tab === 'bets' ? <BetsTable bets={bets} onSoftDelete={async (id) => {
        await API.adminSoftDeleteBet(id)
        showToast('Success', 'Bet soft deleted', 'success')
        await load()
      }} /> : null}
      {tab === 'actions' ? <ActionsTable actions={actions} onUndo={async (id) => {
        await API.adminUndoBulkAction(id)
        showToast('Success', 'Bulk action undone', 'success')
        await load()
      }} /> : null}
    </div>
  )
}

function UsersTable({ users }: { users: Array<any> }) {
  return (
    <Table>
      <thead className="bg-gray-100">
        <tr>
          <Th>Username</Th>
          <Th>Email</Th>
          <Th>Name</Th>
          <Th>Staff</Th>
          <Th>Superuser</Th>
          <Th>Joined</Th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <Td>{user.username}</Td>
            <Td>{user.email}</Td>
            <Td>{[user.first_name, user.last_name].filter(Boolean).join(' ') || '-'}</Td>
            <Td>{String(user.is_staff)}</Td>
            <Td>{String(user.is_superuser)}</Td>
            <Td>{user.date_joined}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

function BetsTable({ bets, onSoftDelete }: { bets: Array<any>; onSoftDelete: (id: number) => Promise<void> }) {
  return (
    <Table>
      <thead className="bg-gray-100">
        <tr>
          <Th>ID</Th>
          <Th>User</Th>
          <Th>Number</Th>
          <Th>Amount</Th>
          <Th>Type</Th>
          <Th>Bazar</Th>
          <Th>Status</Th>
          <Th>Action</Th>
        </tr>
      </thead>
      <tbody>
        {bets.map((bet) => (
          <tr key={bet.id}>
            <Td>{bet.id}</Td>
            <Td>{bet.user?.username}</Td>
            <Td>{bet.number}</Td>
            <Td>{bet.amount}</Td>
            <Td>{bet.bet_type}</Td>
            <Td>{bet.bazar}</Td>
            <Td>{bet.status}</Td>
            <Td>
              <button className="px-2 py-1 rounded bg-red-500 text-white" onClick={() => onSoftDelete(bet.id)}>
                Soft Delete
              </button>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

function ActionsTable({ actions, onUndo }: { actions: Array<any>; onUndo: (id: number) => Promise<void> }) {
  return (
    <Table>
      <thead className="bg-gray-100">
        <tr>
          <Th>ID</Th>
          <Th>User</Th>
          <Th>Action Type</Th>
          <Th>Amount</Th>
          <Th>Total Bets</Th>
          <Th>Status</Th>
          <Th>Action</Th>
        </tr>
      </thead>
      <tbody>
        {actions.map((item) => (
          <tr key={item.id}>
            <Td>{item.id}</Td>
            <Td>{item.user?.username}</Td>
            <Td>{item.action_type}</Td>
            <Td>{item.amount}</Td>
            <Td>{item.total_bets}</Td>
            <Td>{item.status}</Td>
            <Td>
              <button className="px-2 py-1 rounded bg-red-500 text-white disabled:opacity-50" disabled={item.is_undone} onClick={() => onUndo(item.id)}>
                Undo
              </button>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

function Table({ children }: { children: ReactNode }) {
  return <table className="min-w-full bg-white border border-gray-300 rounded-lg overflow-hidden">{children}</table>
}

function Th({ children }: { children: ReactNode }) {
  return <th className="border px-3 py-2 text-left text-sm font-semibold">{children}</th>
}

function Td({ children }: { children: ReactNode }) {
  return <td className="border px-3 py-2 text-sm">{children}</td>
}
