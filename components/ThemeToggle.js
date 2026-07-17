'use client'

import { useEffect, useState } from 'react'

const OPTIONS = [
  { key: 'light', label: 'Clair' },
  { key: 'dark', label: 'Sombre' },
  { key: 'system', label: 'Système' },
]

function applyTheme(pref) {
  const resolved = pref === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : pref
  document.documentElement.dataset.theme = resolved
}

export default function ThemeToggle() {
  const [pref, setPref] = useState('system')

  useEffect(() => {
    try {
      setPref(localStorage.getItem('fliptrack-theme') || 'system')
    } catch {
      // localStorage indisponible
    }
  }, [])

  // Si "système" est choisi, suivre les changements de préférence de l'OS en direct
  useEffect(() => {
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  const choose = (key) => {
    setPref(key)
    try { localStorage.setItem('fliptrack-theme', key) } catch {}
    applyTheme(key)
  }

  return (
    <div className="flex gap-1.5 bg-canvas rounded-xl p-1">
      {OPTIONS.map(o => (
        <button
          key={o.key}
          onClick={() => choose(o.key)}
          className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg transition ${
            pref === o.key ? 'bg-surface text-ink shadow-sm shadow-inkd/5' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
