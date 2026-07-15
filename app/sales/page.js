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
    <div className="min-h-screen bg-[#f4f1f9] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#7c6fe0] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f4f1f9] text-[#2b2438] md:pl-56">
      <Nav />

      <header className="flex items-center justify-between px-6 py-5 border-b border-[#e7e2f3]">
        <div>
          <h1 className="text-xl font-serif italic">Ventes</h1>
          <p className="text-[#948da8] text-xs mt-0.5">{sales.length} vente{sales.length > 1 ? 's' : ''}</p>
        </div>
        {sales.length > 0 && (
          <button
            onClick={() => exportCSV(filtered)}
            className="text-xs bg-white hover:bg-[#f4f1f9] text-[#6a6383] border border-[#e7e2f3] font-medium px-4 py-2 rounded-full transition"
          >
            Exporter CSV
          </button>
        )}
      </header>

      <main className="px-6 py-6 pb-24 md:pb-6 flex flex-col gap-4">

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm shadow-[#2b2438]/5 p-4">
            <p className="text-[#948da8] text-xs mb-2">CA Total</p>
            <p className="text-2xl font-serif text-[#2b2438]">{totalRevenue.toFixed(0)}€</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm shadow-[#2b2438]/5 p-4">
            <p className="text-[#948da8] text-xs mb-2">Marge Nette</p>
            <p className={`text-2xl font-serif ${totalMargin >= 0 ? 'text-[#4f8f6e]' : 'text-[#c14f4a]'}`}>
              {totalMargin.toFixed(0)}€
            </p>
          </div>
        </div>

        {sales.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une vente..."
            className="w-full bg-white border border-[#e7e2f3] rounded-xl px-4 py-2.5 text-[#2b2438] placeholder-[#b8b2c9] focus:outline-none focus:border-[#7c6fe0] transition text-sm"
          />
        )}

        {sales.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#b8b2c9] text-sm">Aucune vente enregistrée</p>
            <button
              onClick={() => router.push('/products')}
              className="mt-3 text-xs text-[#7c6fe0] hover:underline"
            >
              Voir le stock →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#b8b2c9] text-sm">Aucune vente ne correspond à ta recherche</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((s, i) => {
              const margin = saleMargin(s.products, s)
              return (
                <div
                  key={s.id}
                  style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                  className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#2b2438]/5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#2b2438]/10 p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2b2438] truncate">{s.products?.name || 'Produit supprimé'}</p>
                    <p className="text-xs text-[#948da8]">{s.platform || 'Plateforme non précisée'} · {s.sale_date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-[#2b2438]">{s.sale_price}€</p>
                    <p className={`text-xs ${margin >= 0 ? 'text-[#4f8f6e]' : 'text-[#c14f4a]'}`}>
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
