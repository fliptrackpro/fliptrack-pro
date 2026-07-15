'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { saleMargin } from '@/lib/margin'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
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

  const totalRevenue = sales.reduce((acc, s) => acc + (s.sale_price || 0), 0)
  const totalMargin = sales.reduce((acc, s) => {
    const product = products.find(p => p.id === s.product_id)
    return acc + saleMargin(product, s)
  }, 0)
  const inStock = products.filter(p => p.status === 'stock').length
  const sold = products.filter(p => p.status === 'vendu').length
  const marginRate = totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : 0

  const recent = products.slice(0, 5)

  if (!user) return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white md:pl-56">

      <Nav />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-xs mt-0.5">{user?.email}</p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
          className="text-xs text-gray-500 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          Déconnexion
        </button>
      </header>

      <main className="px-6 py-6 pb-24 md:pb-6 flex flex-col gap-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#161920] border border-white/5 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-2">CA Total</p>
            <p className="text-2xl font-bold text-white">{totalRevenue.toFixed(0)}€</p>
            <p className="text-emerald-400 text-xs mt-1">Ventes encaissées</p>
          </div>
          <div className="bg-[#161920] border border-white/5 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-2">Marge Nette</p>
            <p className={`text-2xl font-bold ${totalMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalMargin.toFixed(0)}€
            </p>
            <p className="text-gray-500 text-xs mt-1">Taux {marginRate}%</p>
          </div>
          <div className="bg-[#161920] border border-white/5 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-2">En Stock</p>
            <p className="text-2xl font-bold text-white">{inStock}</p>
            <p className="text-gray-500 text-xs mt-1">Articles disponibles</p>
          </div>
          <div className="bg-[#161920] border border-white/5 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-2">Vendus</p>
            <p className="text-2xl font-bold text-white">{sold}</p>
            <p className="text-gray-500 text-xs mt-1">Articles écoulés</p>
          </div>
        </div>

        {/* Progression marge */}
        <div className="bg-[#161920] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Progression marge</h2>
            <span className="text-xs text-emerald-400 font-medium">{marginRate}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 mb-2">
            <div
              className="bg-emerald-400 h-2 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(Math.max(marginRate, 0), 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>0%</span>
            <span>Objectif 30%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Derniers produits */}
        <div className="bg-[#161920] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Derniers produits</h2>
            <button
              onClick={() => router.push('/products')}
              className="text-xs text-gray-500 hover:text-emerald-400 transition"
            >
              Voir tout →
            </button>
          </div>

          {recent.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 text-sm">Aucun produit encore</p>
              <button
                onClick={() => router.push('/products/new')}
                className="mt-3 text-xs text-emerald-400 hover:underline"
              >
                Ajouter ton premier produit →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${p.status === 'stock' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[160px]">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.category || 'Sans catégorie'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{p.purchase_price}€</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'stock' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                      {p.status === 'stock' ? 'En stock' : 'Vendu'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bouton rapide */}
        <button
          onClick={() => router.push('/products/new')}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-2xl py-4 transition text-sm"
        >
          ➕ Ajouter un produit
        </button>

      </main>
    </div>
  )
}
