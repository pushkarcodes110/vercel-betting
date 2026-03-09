import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SessionProvider, useSession } from '@/hooks/useSession'
import { ToastProvider } from '@/hooks/useToast'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { AdminPage } from '@/pages/AdminPage'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useSession()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return children
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useSession()
  if (!user) return <Navigate to="/" replace />
  if (!user.is_staff && !user.is_superuser) return <Navigate to="/home" replace />
  return children
}

function AppRoutes() {
  const { user } = useSession()

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/home" replace /> : <LoginPage />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={user ? '/home' : '/'} replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </SessionProvider>
  )
}
