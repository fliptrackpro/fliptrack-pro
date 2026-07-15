'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { saleMargin } from '@/lib/margin'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'
import { PlusIcon, TrendUpIcon, ClockIcon } from '@/components/icons'
import CountUp from '@/components/CountUp'

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

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [period, setPeriod] = useState('mois')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setUser(user)

      const { data: prods } = await supabase
        .from('products')
        .select('*, sales(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setProducts(prods || [])

      const allSales = (prods || []).flatMap(p => p.sales || [])
      setSales(allSales)
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

  if (!user) return (
    <div className="min-h-screen bg-[#f4f1f9] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#7c6fe0] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f4f1f9] text-[#2b2438] md:pl-56">

      <Nav />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-[#e7e2f3]">
        <div>
          <h1 className="text-xl font-serif italic">Dashboard</h1>
          <p className="text-[#948da8] text-xs mt-0.5">{user?.email}</p>
        </div>
      </header>

      <main className="px-6 py-6 pb-24 md:pb-6 flex flex-col gap-6">

        {/* Sélecteur de période */}
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                period === p.key ? 'bg-[#7c6fe0]/10 text-[#7c6fe0]' : 'text-[#948da8] hover:bg-[#7c6fe0]/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#2b2438]/5 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2b2438]/10">
            <p className="text-[#948da8] text-xs mb-2">CA</p>
            <p className="text-2xl font-serif text-[#2b2438]"><CountUp value={totalRevenue} />€</p>
            <p className="text-[#4f8f6e] text-xs mt-1">Ventes encaissées</p>
          </div>
          <div className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#2b2438]/5 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2b2438]/10" style={{ animationDelay: '40ms' }}>
            <p className="text-[#948da8] text-xs mb-2">Marge Nette</p>
            <p className={`text-2xl font-serif ${totalMargin >= 0 ? 'text-[#4f8f6e]' : 'text-[#c14f4a]'}`}>
              <CountUp value={totalMargin} />€
            </p>
            <p className="text-[#948da8] text-xs mt-1">Taux {marginRate}%</p>
          </div>
          <div className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#2b2438]/5 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2b2438]/10" style={{ animationDelay: '80ms' }}>
            <p className="text-[#948da8] text-xs mb-2">En Stock</p>
            <p className="text-2xl font-serif text-[#2b2438]"><CountUp value={inStock} /></p>
            <p className="text-[#948da8] text-xs mt-1">Articles disponibles</p>
          </div>
          <div className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#2b2438]/5 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2b2438]/10" style={{ animationDelay: '120ms' }}>
            <p className="text-[#948da8] text-xs mb-2">Vendus</p>
            <p className="text-2xl font-serif text-[#2b2438]"><CountUp value={soldInPeriod} /></p>
            <p className="text-[#948da8] text-xs mt-1">Sur la période</p>
          </div>
        </div>

        {/* Meilleures catégories */}
        <div className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#2b2438]/5 p-5" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendUpIcon className="w-4 h-4 text-[#4f8f6e]" />
            <h2 className="text-sm font-semibold text-[#2b2438]">Meilleures catégories</h2>
          </div>

          {topCategories.length === 0 ? (
            <p className="text-[#b8b2c9] text-sm py-4 text-center">Pas encore de vente sur cette période</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topCategories.map(([cat, margin]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[#4b4560] font-medium">{cat}</span>
                    <span className={margin >= 0 ? 'text-[#4f8f6e]' : 'text-[#c14f4a]'}>{margin.toFixed(0)}€</span>
                  </div>
                  <div className="w-full bg-[#f0edf8] rounded-full h-1.5">
                    <div
                      className="bg-[#7c6fe0] h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${Math.max((Math.abs(margin) / maxCategoryMargin) * 100, 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Produits qui stagnent */}
        <div className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#2b2438]/5 p-5" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-4 h-4 text-[#c98a3e]" />
            <h2 className="text-sm font-semibold text-[#2b2438]">En stock depuis longtemps</h2>
          </div>

          {stagnant.length === 0 ? (
            <p className="text-[#b8b2c9] text-sm py-4 text-center">Rien ne traîne, bien joué</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stagnant.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg border-b border-[#f0edf8] last:border-0 transition-colors hover:bg-[#f4f1f9]">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2b2438] truncate max-w-[180px]">{p.name}</p>
                    <p className="text-xs text-[#948da8]">{p.category || 'Sans catégorie'}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#c98a3e]/10 text-[#c98a3e] flex-shrink-0">
                    {p.days} jours
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bouton rapide */}
        <button
          onClick={() => router.push('/products/new')}
          className="w-full bg-[#7c6fe0] hover:bg-[#6c5dd3] active:scale-[0.98] text-white font-semibold rounded-2xl py-4 transition text-sm flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Ajouter un produit
        </button>

      </main>
    </div>
  )
}
