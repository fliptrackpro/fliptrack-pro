'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SparkleIcon, TrendUpIcon, RepostIcon, WalletIcon, BoxIcon } from '@/components/icons'
import Logo from '@/components/Logo'

const FEATURES = [
  {
    Icon: SparkleIcon,
    title: 'Estimation par IA',
    description: "Prends une photo, l'IA propose le nom, la catégorie, l'état et une fourchette de prix de revente réaliste.",
  },
  {
    Icon: BoxIcon,
    title: 'Annonces multi-plateformes',
    description: 'Génère en un clic un titre et un descriptif adaptés à Vinted, Leboncoin, Facebook, eBay et Vestiaire Collective.',
  },
  {
    Icon: TrendUpIcon,
    title: 'Marge calculée automatiquement',
    description: "Prix d'achat, frais, frais de plateforme : ta marge nette et ton taux sont toujours à jour, par vente et globalement.",
  },
  {
    Icon: RepostIcon,
    title: 'Rappels de repost',
    description: 'FlipTrack te signale les articles à relister avant qu\'ils ne dorment trop longtemps en stock.',
  },
  {
    Icon: WalletIcon,
    title: 'Historique et export',
    description: 'Toutes tes ventes, ta marge par catégorie, export CSV pour ta compta ou ta déclaration.',
  },
]

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/dashboard')
      } else {
        setChecking(false)
      }
    })
  }, [router])

  if (checking) return (
    <div className="min-h-screen bg-[#f5f2ec] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#6d5ce6] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f2ec] text-[#241f2e]">

      <header className="flex items-center justify-between px-6 py-6 max-w-5xl mx-auto">
        <Logo markClass="w-8 h-8" textClass="text-xl" />
        <button
          onClick={() => router.push('/login')}
          className="text-sm font-medium text-[#655e72] hover:text-[#241f2e] transition"
        >
          Se connecter
        </button>
      </header>

      {/* Héro */}
      <main className="max-w-5xl mx-auto px-6">
        <section className="py-16 md:py-24 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif italic leading-tight">
            Achète, revends, <span className="not-italic font-sans font-extrabold text-[#6d5ce6]">gagne en marge</span>.
          </h1>
          <p className="text-[#655e72] text-base md:text-lg mt-5">
            FlipTrack suit ton stock, estime tes prix par IA, génère tes annonces et calcule ta marge — pour ton activité de revente d'occasion.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => router.push('/login')}
              className="bg-[#241f2e] hover:bg-[#3a3347] active:scale-[0.98] text-white font-semibold rounded-full px-6 py-3.5 transition text-sm"
            >
              Commencer gratuitement →
            </button>
          </div>
        </section>

        {/* Aperçu dashboard */}
        <section className="pb-16">
          <div className="rounded-[22px] p-6 md:p-8 bg-gradient-to-br from-[#6d5ce6] via-[#8b7bf0] to-[#a893f5] relative overflow-hidden">
            <div className="absolute -right-10 -bottom-12 w-56 h-56 rounded-full bg-white/10" />
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/15 backdrop-blur rounded-2xl p-4 col-span-2 md:col-span-1">
                <p className="text-[11px] uppercase tracking-widest text-white/70">Marge nette</p>
                <p className="font-serif text-3xl text-white mt-1">+128€</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/70">CA</p>
                <p className="font-serif text-2xl text-white mt-1">342€</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/70">En stock</p>
                <p className="font-serif text-2xl text-white mt-1">14</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/70">Vendus</p>
                <p className="font-serif text-2xl text-white mt-1">6</p>
              </div>
            </div>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section className="pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-5">
                <div className="w-9 h-9 rounded-full bg-[#efebfd] flex items-center justify-center mb-3">
                  <f.Icon className="w-4 h-4 text-[#6d5ce6]" />
                </div>
                <h3 className="text-sm font-bold">{f.title}</h3>
                <p className="text-xs text-[#655e72] mt-1.5 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="pb-20 text-center">
          <div className="bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-10">
            <h2 className="text-2xl font-serif italic">Prêt à suivre tes flips ?</h2>
            <p className="text-[#655e72] text-sm mt-2">Gratuit pour démarrer, aucune carte bancaire requise.</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 bg-[#241f2e] hover:bg-[#3a3347] active:scale-[0.98] text-white font-semibold rounded-full px-6 py-3.5 transition text-sm"
            >
              Créer mon compte →
            </button>
          </div>
        </section>
      </main>

      <footer className="text-center pb-10 text-xs text-[#b3aebf]">
        FlipTrack
      </footer>
    </div>
  )
}
