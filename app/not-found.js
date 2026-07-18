import Link from 'next/link'
import { LogoMark } from '@/components/Logo'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <LogoMark className="w-14 h-14 mx-auto mb-6 rounded-[28%] shadow-lg shadow-accent/25" />
        <p className="font-serif text-6xl italic">404</p>
        <h1 className="text-lg font-bold mt-3">Page introuvable</h1>
        <p className="text-sm text-muted mt-2">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-6 bg-inkd hover:bg-inkdh active:scale-[0.98] text-white font-semibold rounded-xl px-6 py-3 transition text-sm"
        >
          Retour à l'accueil →
        </Link>
      </div>
    </div>
  )
}
