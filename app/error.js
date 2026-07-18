'use client'

import { LogoMark } from '@/components/Logo'

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <LogoMark className="w-14 h-14 mx-auto mb-6 rounded-[28%] shadow-lg shadow-accent/25" />
        <h1 className="text-lg font-bold">Une erreur est survenue</h1>
        <p className="text-sm text-muted mt-2">
          Ce n'est pas toi, c'est nous. Réessaie — si ça persiste, recharge la page.
        </p>
        <button
          onClick={reset}
          className="mt-6 bg-inkd hover:bg-inkdh active:scale-[0.98] text-white font-semibold rounded-xl px-6 py-3 transition text-sm"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
