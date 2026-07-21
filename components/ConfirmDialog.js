'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Modale de confirmation, en remplacement de confirm()/prompt() natifs :
 * stylée avec le thème, focus géré, Échap et clic sur le fond pour annuler.
 * `requireText` impose de saisir un mot exact avant d'activer l'action (suppressions lourdes).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive = false,
  requireText = null,
  busy = false,
  onConfirm,
  onCancel,
}) {
  const [typed, setTyped] = useState('')
  const confirmRef = useRef(null)
  const inputRef = useRef(null)
  const previouslyFocused = useRef(null)

  useEffect(() => {
    if (!open) { setTyped(''); return }
    previouslyFocused.current = document.activeElement
    // Le champ de saisie prime sur le bouton pour ne pas confirmer par inadvertance
    const target = requireText ? inputRef.current : confirmRef.current
    target?.focus()
    return () => previouslyFocused.current?.focus?.()
  }, [open, requireText])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  const ready = !requireText || typed === requireText

  return (
    <div
      className="fixed inset-0 z-50 bg-inkd/60 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="animate-pop-in bg-surface rounded-3xl shadow-2xl shadow-inkd/30 w-full max-w-sm p-6 flex flex-col gap-4"
      >
        <div>
          <h2 id="confirm-title" className={`text-base font-bold ${destructive ? 'text-coral' : 'text-ink'}`}>
            {title}
          </h2>
          {message && <p className="text-sm text-muted mt-1.5 leading-snug">{message}</p>}
        </div>

        {requireText && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              Tape « {requireText} » pour confirmer
            </span>
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && ready && !busy) onConfirm() }}
              className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-ink placeholder-faint focus:outline-none focus:border-accent transition text-sm"
              placeholder={requireText}
              autoComplete="off"
            />
          </label>
        )}

        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 bg-canvas hover:bg-line text-muted2 font-semibold rounded-xl px-4 py-3 transition text-sm disabled:opacity-50 min-h-[44px]"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={busy || !ready}
            className={`flex-1 font-semibold rounded-xl px-4 py-3 transition text-sm min-h-[44px] disabled:opacity-50 text-white ${
              destructive ? 'bg-coralbtn hover:opacity-90' : 'bg-inkd hover:bg-inkdh'
            }`}
          >
            {busy ? 'Un instant...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
