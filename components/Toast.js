'use client'

import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'error') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t.slice(-2), { id, message, type }]) // 3 max à l'écran
    // Les succès s'effacent seuls ; les erreurs restent tant qu'on ne les a pas lues.
    if (type !== 'error') {
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    }
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* bottom-24 sur mobile : la barre de navigation occupe le bas de l'écran */}
      <div className="fixed bottom-24 md:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto">
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`animate-rise-in rounded-xl pl-4 pr-2 py-3 text-sm shadow-lg border bg-surface flex items-start gap-2 ${
              t.type === 'error'
                ? 'border-coral/25 text-coral'
                : 'border-sage/25 text-sage'
            }`}
          >
            <span className="flex-1 min-w-0">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Fermer la notification"
              className="flex-shrink-0 -my-1 opacity-60 hover:opacity-100 transition inline-flex items-center justify-center min-w-[32px] min-h-[32px] rounded-lg"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
