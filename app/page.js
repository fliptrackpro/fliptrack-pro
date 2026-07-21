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
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas text-ink">

      <header className="flex items-center justify-between px-6 py-6 max-w-5xl mx-auto">
        <Logo markClass="w-8 h-8" textClass="text-xl" />
        <button
          onClick={() => router.push('/login')}
          className="text-sm font-medium text-muted2 hover:text-ink transition"
        >
          Se connecter
        </button>
      </header>

      {/* Héro */}
      <main className="max-w-5xl mx-auto px-6">
        <section className="py-16 md:py-24 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif italic leading-tight">
            Achète, revends, <span className="not-italic font-sans font-extrabold text-accent">gagne en marge</span>.
          </h1>
          <p className="text-muted2 text-base md:text-lg mt-5">
            FlipTrack suit ton stock, estime tes prix par IA, génère tes annonces et calcule ta marge — pour ton activité de revente d'occasion.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => router.push('/login')}
              className="bg-inkd hover:bg-inkdh active:scale-[0.98] text-white font-semibold rounded-full px-6 py-3.5 transition text-sm"
            >
              Commencer gratuitement →
            </button>
          </div>
        </section>

        {/* Aperçu dashboard */}
        <section className="pb-16">
          <div className="rounded-[22px] p-6 md:p-8 bg-gradient-to-br from-accent via-accent2 to-accent3 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-12 w-56 h-56 rounded-full bg-white/10" />
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/12 ring-1 ring-white/15 rounded-2xl p-4 col-span-2 md:col-span-1">
                <p className="text-[11px] uppercase tracking-widest text-white/70">Marge nette</p>
                <p className="font-serif text-3xl text-white mt-1">+128€</p>
              </div>
              <div className="bg-white/12 ring-1 ring-white/15 rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/70">CA</p>
                <p className="font-serif text-2xl text-white mt-1">342€</p>
              </div>
              <div className="bg-white/12 ring-1 ring-white/15 rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/70">En stock</p>
                <p className="font-serif text-2xl text-white mt-1">14</p>
              </div>
              <div className="bg-white/12 ring-1 ring-white/15 rounded-2xl p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/70">Vendus</p>
                <p className="font-serif text-2xl text-white mt-1">6</p>
              </div>
            </div>
          </div>
        </section>

        {/* Fonctionnalités : la principale est mise en avant, les autres tiennent
            dans un seul panneau divisé plutôt qu'en grille de cartes identiques. */}
        <section className="pb-20 flex flex-col gap-4">
          {(() => {
            const [lead, ...rest] = FEATURES
            return (
              <>
                <div className="bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-6 md:p-8">
                  <div className="w-11 h-11 rounded-full bg-violetbg flex items-center justify-center mb-4">
                    <lead.Icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold">{lead.title}</h3>
                  <p className="text-sm text-muted2 mt-2 leading-relaxed max-w-[60ch]">{lead.description}</p>
                </div>

                {/* Le fond du conteneur fait office de séparateur : les gaps de 1px le
                    laissent transparaître, ce qui reste juste quel que soit le nombre de colonnes. */}
                <div className="bg-line rounded-2xl shadow-sm shadow-inkd/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden">
                  {rest.map(f => (
                    <div key={f.title} className="bg-surface p-5">
                      <f.Icon className="w-4 h-4 text-accent mb-2.5" />
                      <h3 className="text-sm font-bold">{f.title}</h3>
                      <p className="text-xs text-muted2 mt-1.5 leading-relaxed">{f.description}</p>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </section>

        {/* CTA final */}
        <section className="pb-20 text-center">
          <div className="bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-10">
            <h2 className="text-2xl font-serif italic">Prêt à suivre tes flips ?</h2>
            <p className="text-muted2 text-sm mt-2">Gratuit pour démarrer, aucune carte bancaire requise.</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 bg-inkd hover:bg-inkdh active:scale-[0.98] text-white font-semibold rounded-full px-6 py-3.5 transition text-sm"
            >
              Créer mon compte →
            </button>
          </div>
        </section>
      </main>

      <footer className="text-center pb-10 text-xs text-faint">
        FlipTrack
      </footer>
    </div>
  )
}
