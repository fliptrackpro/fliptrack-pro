'use client'

import { useMemo } from 'react'
import CountUp from '@/components/CountUp'
import { CheckIcon } from '@/components/icons'

const COLORS = ['#6d5ce6', '#a893f5', '#4a8a6f', '#e8b64c', '#e0654a']

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
    <div className="fixed inset-0 z-50 bg-[#241f2e]/60 backdrop-blur-sm flex items-center justify-center px-4 overflow-hidden">
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

      <div className="animate-pop-in relative bg-white rounded-3xl shadow-2xl shadow-[#241f2e]/30 p-8 w-full max-w-sm text-center">
        <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${positive ? 'bg-[#4a8a6f]/10 text-[#4a8a6f]' : 'bg-[#e0654a]/10 text-[#e0654a]'}`}>
          <CheckIcon className="w-7 h-7" />
        </div>

        <p className="text-[11px] font-semibold text-[#8b8496] uppercase tracking-widest mt-5">Vente enregistrée</p>

        <p className={`font-serif text-5xl mt-2 ${positive ? 'text-[#4a8a6f]' : 'text-[#e0654a]'}`}>
          {positive ? '+' : ''}<CountUp value={margin} decimals={2} />€
        </p>
        <p className="text-sm text-[#8b8496] mt-1.5">de marge nette</p>

        <p className="text-sm text-[#4a4356] mt-4 leading-snug">
          « {productName} »{platform ? ` vendu sur ${platform}` : ''}
        </p>
        {positive ? (
          <p className="text-xs text-[#8b8496] mt-1">Beau flip, continue sur ta lancée.</p>
        ) : (
          <p className="text-xs text-[#8b8496] mt-1">Marge négative sur ce coup, ça arrive. La prochaine sera la bonne.</p>
        )}

        <div className="flex flex-col gap-2 mt-7">
          <button
            onClick={onViewSales}
            className="w-full bg-[#241f2e] hover:bg-[#3a3347] active:scale-[0.98] text-white font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            Voir mes ventes →
          </button>
          <button
            onClick={onBackToStock}
            className="w-full bg-[#f5f2ec] hover:bg-[#eae5f0] text-[#655e72] font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            Retour au stock
          </button>
        </div>
      </div>
    </div>
  )
}
