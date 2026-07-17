'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { saleMargin } from '@/lib/margin'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'
import { PlusIcon, TrendUpIcon, ClockIcon, RepostIcon, TargetIcon, CheckIcon, SparkleIcon } from '@/components/icons'
import CountUp from '@/components/CountUp'

function maskEmail(email) {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(local.length - 2, 3))}@${domain}`
}

const PERIODS = [
  { key: 'semaine', label: 'Cette semaine' },
  { key: 'mois', label: 'Ce mois' },
  { key: 'tout', label: 'Tout' },
]

function isInPeriod(dateStr, period) {
  if (period === 'tout') return true
  const d = new Date(dateStr)
  const now = new Date()
  if (period === 'semaine') {
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    return d >= weekAgo
  }
  if (period === 'mois') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }
  return true
}

function daysSince(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - d) / (1000 * 60 * 60 * 24))
}

function last7DaysMargin(sales, products) {
  const days = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const dayMargin = sales
      .filter(s => s.sale_date === key)
      .reduce((acc, s) => {
        const p = products.find(pp => pp.id === s.product_id)
        return acc + saleMargin(p, s)
      }, 0)
    days.push(Math.max(dayMargin, 0))
  }
  return days
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [period, setPeriod] = useState('mois')
  const [listings, setListings] = useState([])
  const [goal, setGoal] = useState(null)
  const [goalInput, setGoalInput] = useState('')
  const [editingGoal, setEditingGoal] = useState(false)
  const [periodPill, setPeriodPill] = useState({ left: 0, width: 0 })
  const periodBtnRefs = useRef({})
  const router = useRouter()

  useEffect(() => {
    const btn = periodBtnRefs.current[period]
    if (btn) setPeriodPill({ left: btn.offsetLeft, width: btn.offsetWidth })
  }, [period])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setUser(user)

      try {
        const savedGoal = parseFloat(localStorage.getItem(`fliptrack-goal-${user.id}`))
        if (savedGoal > 0) setGoal(savedGoal)
      } catch {
        // localStorage indisponible, pas d'objectif
      }

      const { data: prods } = await supabase
        .from('products')
        .select('*, sales(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setProducts(prods || [])

      const allSales = (prods || []).flatMap(p => p.sales || [])
      setSales(allSales)

      const { data: activeListings } = await supabase
        .from('listings')
        .select('*, products(name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('listed_at', { ascending: true })
      setListings(activeListings || [])
    }
    load()
  }, [router])

  const periodSales = sales.filter(s => isInPeriod(s.sale_date, period))

  const totalRevenue = periodSales.reduce((acc, s) => acc + (s.sale_price || 0), 0)
  const totalMargin = periodSales.reduce((acc, s) => {
    const product = products.find(p => p.id === s.product_id)
    return acc + saleMargin(product, s)
  }, 0)
  const inStock = products.filter(p => p.status === 'stock').length
  const soldInPeriod = periodSales.length
  const marginRate = totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : 0

  const categoryMargins = {}
  periodSales.forEach(s => {
    const product = products.find(p => p.id === s.product_id)
    const cat = product?.category || 'Autre'
    categoryMargins[cat] = (categoryMargins[cat] || 0) + saleMargin(product, s)
  })
  const topCategories = Object.entries(categoryMargins)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxCategoryMargin = topCategories.length ? Math.max(...topCategories.map(c => c[1]), 1) : 1

  const stagnant = products
    .filter(p => p.status === 'stock')
    .map(p => ({ ...p, days: daysSince(p.purchase_date) }))
    .filter(p => p.days >= 30)
    .sort((a, b) => b.days - a.days)
    .slice(0, 5)

  const recentStock = products.filter(p => p.status === 'stock').slice(0, 3)

  const toRepost = products
    .filter(p => p.status === 'stock')
    .filter(p => !p.last_reposted_at || daysSince(p.last_reposted_at) >= 14)
    .sort((a, b) => {
      const da = a.last_reposted_at ? daysSince(a.last_reposted_at) : Infinity
      const db = b.last_reposted_at ? daysSince(b.last_reposted_at) : Infinity
      return db - da
    })
    .slice(0, 5)

  const sparkline = last7DaysMargin(sales, products)
  const maxSpark = Math.max(...sparkline, 1)

  // Objectif de marge mensuel (toujours sur le mois en cours, indépendant du sélecteur de période)
  const monthMargin = sales
    .filter(s => isInPeriod(s.sale_date, 'mois'))
    .reduce((acc, s) => acc + saleMargin(products.find(p => p.id === s.product_id), s), 0)
  const goalProgress = goal ? Math.min((monthMargin / goal) * 100, 100) : 0
  const goalReached = goal && monthMargin >= goal

  const saveGoal = () => {
    const value = parseFloat(goalInput)
    if (!value || value <= 0) return
    setGoal(value)
    setEditingGoal(false)
    try { localStorage.setItem(`fliptrack-goal-${user.id}`, String(value)) } catch {}
  }

  const onboardingSteps = [
    { label: 'Ajoute ton premier article', done: products.length > 0, href: '/products/new' },
    { label: "Prends une photo et laisse l'IA estimer le prix", done: products.some(p => p.photo_url), href: '/products/new' },
    { label: 'Fixe ton objectif de marge du mois', done: !!goal, action: () => setEditingGoal(true) },
    { label: 'Enregistre ta première vente', done: sales.length > 0, href: '/products' },
  ]
  const onboardingDone = onboardingSteps.filter(s => s.done).length
  const showOnboarding = onboardingDone < onboardingSteps.length

  if (!user) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas text-ink md:pl-56">

      <Nav />

      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-5">
        <div>
          <h1 className="text-xl font-serif italic">Dashboard</h1>
          <p className="text-muted text-xs mt-0.5">{maskEmail(user?.email)}</p>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-2 pb-24 md:pb-6 flex flex-col gap-6 max-w-3xl mx-auto w-full">

        {/* Checklist bien démarrer */}
        {showOnboarding && (
          <section className="animate-rise-in bg-surface rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <SparkleIcon className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold">Bien démarrer</h2>
              </div>
              <span className="text-xs font-bold text-accent">{onboardingDone}/{onboardingSteps.length}</span>
            </div>
            <div className="w-full bg-line rounded-full h-1.5 mb-3">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-accent to-accent3 transition-all duration-700"
                style={{ width: `${Math.max((onboardingDone / onboardingSteps.length) * 100, 4)}%` }}
              />
            </div>
            <div className="flex flex-col">
              {onboardingSteps.map((step, i) => (
                <button
                  key={step.label}
                  onClick={() => step.done ? null : (step.href ? router.push(step.href) : step.action?.())}
                  disabled={step.done}
                  className={`flex items-center gap-3 py-2.5 text-left transition ${i < onboardingSteps.length - 1 ? 'border-b border-canvas' : ''} ${step.done ? 'cursor-default' : 'hover:opacity-70'}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                    step.done ? 'bg-sage text-white' : 'border-[1.5px] border-line2'
                  }`}>
                    {step.done && <CheckIcon className="w-3 h-3" />}
                  </span>
                  <span className={`text-sm ${step.done ? 'text-faint line-through' : 'text-ink2 font-medium'}`}>
                    {step.label}
                  </span>
                  {!step.done && <span className="ml-auto text-faint text-xs">→</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Sélecteur de période */}
        <div className="relative flex gap-2">
          <div
            className="absolute top-0 bottom-0 bg-accent/10 rounded-full transition-all duration-300 ease-out"
            style={{ left: periodPill.left, width: periodPill.width }}
          />
          {PERIODS.map(p => (
            <button
              key={p.key}
              ref={(el) => { periodBtnRefs.current[p.key] = el }}
              onClick={() => setPeriod(p.key)}
              className={`relative z-10 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                period === p.key ? 'text-accent' : 'text-muted hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Héro + stats secondaires */}
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-3.5">
          <div className="animate-rise-in relative overflow-hidden rounded-[22px] p-6 text-white flex flex-col justify-between min-h-[220px] bg-gradient-to-br from-accent via-accent2 to-accent3">
            <div className="absolute -right-10 -bottom-12 w-44 h-44 rounded-full bg-white/10" />
            <div className="relative z-10">
              <p className="text-[11px] uppercase tracking-widest opacity-75">Marge nette · {PERIODS.find(p => p.key === period)?.label.toLowerCase()}</p>
              <p className="font-serif text-5xl mt-2.5"><CountUp value={totalMargin} />€</p>
              <p className="text-sm opacity-85 mt-1.5">Taux de marge {marginRate}%</p>
            </div>
            <div className="relative z-10 flex items-end gap-1 h-10 mt-4">
              {sparkline.map((v, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm ${i === sparkline.length - 1 ? 'bg-surface' : 'bg-white/35'}`}
                  style={{ height: `${Math.max((v / maxSpark) * 100, 8)}%` }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-3.5">
            <div className="animate-rise-in bg-surface rounded-2xl p-4" style={{ animationDelay: '40ms' }}>
              <p className="text-[11px] text-muted uppercase tracking-wide">Chiffre d'affaires</p>
              <p className="font-serif text-2xl mt-1.5"><CountUp value={totalRevenue} />€</p>
            </div>
            <div className="animate-rise-in bg-surface rounded-2xl p-4" style={{ animationDelay: '80ms' }}>
              <p className="text-[11px] text-muted uppercase tracking-wide">En stock</p>
              <p className="font-serif text-2xl mt-1.5"><CountUp value={inStock} /></p>
            </div>
          </div>
        </div>

        <div className="animate-rise-in bg-surface rounded-2xl p-4 flex items-center justify-between" style={{ animationDelay: '100ms' }}>
          <p className="text-sm text-muted">Articles vendus sur la période</p>
          <p className="font-serif text-xl"><CountUp value={soldInPeriod} /></p>
        </div>

        {/* Objectif de marge du mois */}
        <section className="animate-rise-in bg-surface rounded-2xl p-5" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TargetIcon className={`w-4 h-4 ${goalReached ? 'text-sage' : 'text-accent'}`} />
              <h2 className="text-sm font-bold">Objectif du mois</h2>
            </div>
            {goal && !editingGoal && (
              <button
                onClick={() => { setGoalInput(String(goal)); setEditingGoal(true) }}
                className="text-xs text-muted hover:text-accent font-medium transition"
              >
                Modifier
              </button>
            )}
          </div>

          {(!goal || editingGoal) ? (
            <div>
              <p className="text-xs text-muted mb-3">
                Fixe-toi une marge à atteindre ce mois-ci, la progression se met à jour à chaque vente.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                    placeholder="Ex: 300"
                    className="w-full bg-canvas border border-transparent focus:border-accent rounded-xl px-4 py-2.5 pr-8 text-sm text-ink placeholder-faint focus:outline-none transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-faint text-sm">€</span>
                </div>
                <button
                  onClick={saveGoal}
                  disabled={!parseFloat(goalInput)}
                  className="bg-inkd hover:bg-inkdh disabled:bg-line disabled:text-disabled text-white font-semibold rounded-xl px-4 py-2.5 transition text-sm"
                >
                  {goal ? 'Enregistrer' : 'Définir'}
                </button>
                {editingGoal && goal && (
                  <button
                    onClick={() => setEditingGoal(false)}
                    className="bg-canvas hover:bg-line text-muted2 font-semibold rounded-xl px-3 py-2.5 transition text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-end justify-between mb-2">
                <p className="font-serif text-2xl">
                  <span className={goalReached ? 'text-sage' : ''}><CountUp value={monthMargin} />€</span>
                  <span className="text-sm text-faint font-sans"> / {goal}€</span>
                </p>
                <span className={`text-xs font-bold ${goalReached ? 'text-sage' : 'text-accent'}`}>
                  {Math.round(goalProgress)}%
                </span>
              </div>
              <div className="w-full bg-line rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-700 ${
                    goalReached ? 'bg-gradient-to-r from-sage to-sage2' : 'bg-gradient-to-r from-accent to-accent3'
                  }`}
                  style={{ width: `${Math.max(goalProgress, 2)}%` }}
                />
              </div>
              <p className={`text-xs mt-2 ${goalReached ? 'text-sage font-semibold' : 'text-muted'}`}>
                {goalReached
                  ? 'Objectif atteint, bravo ! Tu peux viser plus haut.'
                  : `Plus que ${(goal - monthMargin).toFixed(0)}€ de marge pour atteindre ton objectif.`}
              </p>
            </div>
          )}
        </section>

        {/* Meilleures catégories */}
        <section style={{ animationDelay: '140ms' }} className="animate-rise-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendUpIcon className="w-4 h-4 text-sage" />
              <h2 className="text-sm font-bold">Meilleures catégories</h2>
            </div>
          </div>
          <div className="bg-surface rounded-2xl p-5">
            {topCategories.length === 0 ? (
              <p className="text-faint text-sm py-4 text-center">Pas encore de vente sur cette période</p>
            ) : (
              <div className="flex flex-col gap-4">
                {topCategories.map(([cat, margin]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold">{cat}</span>
                      <span className="font-serif text-sage font-bold">{margin >= 0 ? '+' : ''}{margin.toFixed(0)}€</span>
                    </div>
                    <div className="w-full bg-line rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-accent to-accent3 transition-all duration-700"
                        style={{ width: `${Math.max((Math.abs(margin) / maxCategoryMargin) * 100, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Stock récent */}
        {recentStock.length > 0 && (
          <section style={{ animationDelay: '180ms' }} className="animate-rise-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold">Stock récent</h2>
              <button onClick={() => router.push('/products')} className="text-xs text-accent font-semibold hover:underline">
                Voir tout →
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recentStock.map(p => (
                <div key={p.id} className="bg-surface rounded-2xl overflow-hidden cursor-pointer transition hover:-translate-y-0.5" onClick={() => router.push(`/products/${p.id}/edit`)}>
                  <div className="aspect-square bg-violetbg flex items-center justify-center">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-muted">photo</span>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-bold leading-tight truncate">{p.name}</p>
                    <p className="text-[10px] text-muted mt-0.5 mb-2 truncate">{p.category || 'Sans catégorie'}</p>
                    <span className="inline-block bg-sagebg text-sage text-xs font-bold px-2.5 py-0.5 rounded-full">{p.purchase_price}€</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Annonces actives */}
        {listings.length > 0 && (
          <section style={{ animationDelay: '190ms' }} className="animate-rise-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RepostIcon className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold">Annonces actives</h2>
              </div>
              <span className="text-xs text-muted">{listings.length} en ligne</span>
            </div>
            <div className="bg-surface rounded-2xl px-5">
              {listings.slice(0, 6).map((l, i) => {
                const age = daysSince(l.listed_at)
                const stale = age >= 14
                return (
                  <div
                    key={l.id}
                    className={`flex items-center justify-between py-3 cursor-pointer ${i < Math.min(listings.length, 6) - 1 ? 'border-b border-line' : ''}`}
                    onClick={() => l.product_id && router.push(`/products/${l.product_id}/publish`)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[180px]">{l.products?.name || 'Article'}</p>
                      <p className="text-xs text-muted">{l.platform}{l.listed_price != null ? ` · ${l.listed_price}€` : ''}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${stale ? 'bg-coralbg text-coral' : 'bg-violetbg text-accent'}`}>
                      {age <= 0 ? "auj." : `${age}j`}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* À reposter */}
        {toRepost.length > 0 && (
          <section style={{ animationDelay: '200ms' }} className="animate-rise-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <RepostIcon className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-bold">À reposter</h2>
              </div>
              <button onClick={() => router.push('/products')} className="text-xs text-accent font-semibold hover:underline">
                Voir tout →
              </button>
            </div>
            <div className="bg-surface rounded-2xl px-5">
              {toRepost.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between py-3 cursor-pointer ${i < toRepost.length - 1 ? 'border-b border-line' : ''}`}
                  onClick={() => router.push(`/products/${p.id}/publish`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate max-w-[180px]">{p.name}</p>
                    <p className="text-xs text-muted">{p.category || 'Sans catégorie'}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violetbg text-accent flex-shrink-0">
                    {p.last_reposted_at ? `${daysSince(p.last_reposted_at)}j` : 'Jamais'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Produits qui stagnent */}
        <section style={{ animationDelay: '220ms' }} className="animate-rise-in">
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon className="w-4 h-4 text-coral" />
            <h2 className="text-sm font-bold">En stock depuis longtemps</h2>
          </div>
          <div className="bg-surface rounded-2xl px-5">
            {stagnant.length === 0 ? (
              <p className="text-faint text-sm py-6 text-center">Rien ne traîne, bien joué</p>
            ) : (
              stagnant.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between py-3 ${i < stagnant.length - 1 ? 'border-b border-line' : ''}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate max-w-[180px]">{p.name}</p>
                    <p className="text-xs text-muted">{p.category || 'Sans catégorie'}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-coralbg text-coral flex-shrink-0">
                    {p.days} jours
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Bouton rapide */}
        <button
          onClick={() => router.push('/products/new')}
          className="w-full bg-inkd hover:bg-inkdh active:scale-[0.98] text-white font-semibold rounded-2xl py-4 transition text-sm flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Ajouter un produit
        </button>

      </main>
    </div>
  )
}
