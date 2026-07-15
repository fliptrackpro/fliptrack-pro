'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { saleMargin } from '@/lib/margin'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'

function exportCSV(sales) {
  const headers = ['Date', 'Produit', 'Plateforme', 'Prix achat', 'Frais achat', 'Prix vente', 'Frais plateforme', 'Marge']
  const rows = sales.map(s => {
    const p = s.products
    const margin = saleMargin(p, s)
    return [
      s.sale_date,
      p?.name || '',
      s.platform || '',
      p?.purchase_price ?? '',
      p?.purchase_fees ?? '',
      s.sale_price ?? '',
      s.platform_fees ?? '',
      margin.toFixed(2),
    ]
  })
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fliptrack-ventes-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function SalesPage() {
  const [user, setUser] = useState(null)
  const [sales, setSales] = useState([])
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setUser(user)

      const { data } = await supabase
        .from('sales')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .order('sale_date', { ascending: false })

      setSales(data || [])
    }
    load()
  }, [router])

  const filtered = sales.filter(s => (s.products?.name || '').toLowerCase().includes(search.toLowerCase()))

  const totalRevenue = filtered.reduce((acc, s) => acc + (s.sale_price || 0), 0)
  const totalMargin = filtered.reduce((acc, s) => acc + saleMargin(s.products, s), 0)

  if (!user) return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white md:pl-56">
      <Nav />

      <header className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold">Ventes</h1>
          <p className="text-gray-500 text-xs mt-0.5">{sales.length} vente{sales.length > 1 ? 's' : ''}</p>
        </div>
        {sales.length > 0 && (
          <button
            onClick={() => exportCSV(filtered)}
            className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 font-medium px-4 py-2 rounded-lg transition"
          >
            Exporter CSV
          </button>
        )}
      </header>

      <main className="px-6 py-6 pb-24 md:pb-6 flex flex-col gap-4">

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#161920] border border-white/5 rounded-2xl shadow-sm shadow-black/20 p-4">
            <p className="text-gray-500 text-xs mb-2">CA Total</p>
            <p className="text-2xl font-bold text-white">{totalRevenue.toFixed(0)}€</p>
          </div>
          <div className="bg-[#161920] border border-white/5 rounded-2xl shadow-sm shadow-black/20 p-4">
            <p className="text-gray-500 text-xs mb-2">Marge Nette</p>
            <p className={`text-2xl font-bold ${totalMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalMargin.toFixed(0)}€
            </p>
          </div>
        </div>

        {sales.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une vente..."
            className="w-full bg-[#161920] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-400 transition text-sm"
          />
        )}

        {sales.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-sm">Aucune vente enregistrée</p>
            <button
              onClick={() => router.push('/products')}
              className="mt-3 text-xs text-indigo-400 hover:underline"
            >
              Voir le stock →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-sm">Aucune vente ne correspond à ta recherche</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(s => {
              const margin = saleMargin(s.products, s)
              return (
                <div key={s.id} className="bg-[#161920] border border-white/5 rounded-2xl shadow-sm shadow-black/20 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{s.products?.name || 'Produit supprimé'}</p>
                    <p className="text-xs text-gray-500">{s.platform || 'Plateforme non précisée'} · {s.sale_date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-white">{s.sale_price}€</p>
                    <p className={`text-xs ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {margin >= 0 ? '+' : ''}{margin.toFixed(2)}€ marge
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
