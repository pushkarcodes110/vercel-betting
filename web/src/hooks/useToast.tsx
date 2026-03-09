import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'warning'

type Toast = {
  id: number
  title: string
  message: string
  type: ToastType
}

type ToastContextValue = {
  showToast: (title: string, message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (title: string, message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    const toast: Toast = { id, title, message, type }
    setToasts((prev) => [...prev, toast])

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 3200)
  }

  const value = useMemo(() => ({ showToast }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast show" style={{ borderLeftColor: toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#22c55e' }}>
            <div className="flex-1">
              <p className="font-semibold text-sm">{toast.title}</p>
              <p className="text-sm text-gray-600">{toast.message}</p>
            </div>
            <button className="text-gray-400 hover:text-gray-700" onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
