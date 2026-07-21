'use client'

import { useMemo } from 'react'
import CountUp from '@/components/CountUp'
import { CheckIcon } from '@/components/icons'

// Référencer les tokens plutôt que des hex : les confettis suivent alors le thème,
// au lieu d'être les seules couleurs en dur de l'app.
const COLORS = [
  'rgb(var(--accent))',
  'rgb(var(--accent3))',
  'rgb(var(--sage))',
  'rgb(var(--gold))',
  'rgb(var(--coral))',
]

export default function SaleCelebration({ productName, platform, margin, onViewSales, onBackToStock }) {
  const positive = margin >= 0

  const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.9,
    duration: 2.4 + Math.random() * 1.8,
    size: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length],
  })), [])

  return (
    <div className="fixed inset-0 z-50 bg-inkd/60 backdrop-blur-sm flex items-center justify-center px-4 overflow-hidden">
      {positive && pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.45}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      <div className="animate-pop-in relative bg-surface rounded-3xl shadow-2xl shadow-inkd/30 p-8 w-full max-w-sm text-center">
        <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${positive ? 'bg-sage/10 text-sage' : 'bg-coral/10 text-coral'}`}>
          <CheckIcon className="w-7 h-7" />
        </div>

        <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mt-5">Vente enregistrée</p>

        <p className={`font-serif text-5xl mt-2 ${positive ? 'text-sage' : 'text-coral'}`}>
          {positive ? '+' : ''}<CountUp value={margin} decimals={2} />€
        </p>
        <p className="text-sm text-muted mt-1.5">de marge nette</p>

        <p className="text-sm text-ink2 mt-4 leading-snug">
          « {productName} »{platform ? ` vendu sur ${platform}` : ''}
        </p>
        {positive ? (
          <p className="text-xs text-muted mt-1">Beau flip, continue sur ta lancée.</p>
        ) : (
          <p className="text-xs text-muted mt-1">Marge négative sur ce coup, ça arrive. La prochaine sera la bonne.</p>
        )}

        <div className="flex flex-col gap-2 mt-7">
          <button
            onClick={onViewSales}
            className="w-full bg-inkd hover:bg-inkdh active:scale-[0.98] text-white font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            Voir mes ventes →
          </button>
          <button
            onClick={onBackToStock}
            className="w-full bg-canvas hover:bg-line text-muted2 font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            Retour au stock
          </button>
        </div>
      </div>
    </div>
  )
}
