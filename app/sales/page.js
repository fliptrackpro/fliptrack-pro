'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { saleMargin } from '@/lib/margin'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'

export default function SalesPage() {
  const [user, setUser] = useState(null)
  const [sales, setSales] = useState([])
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

  const totalRevenue = sales.reduce((acc, s) => acc + (s.sale_price || 0), 0)
  const totalMargin = sales.reduce((acc, s) => acc + saleMargin(s.products, s), 0)

  if (!user) return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
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
      </header>

      <main className="px-6 py-6 pb-24 md:pb-6 flex flex-col gap-4">

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#161920] border border-white/5 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-2">CA Total</p>
            <p className="text-2xl font-bold text-white">{totalRevenue.toFixed(0)}€</p>
          </div>
          <div className="bg-[#161920] border border-white/5 rounded-2xl p-4">
            <p className="text-gray-500 text-xs mb-2">Marge Nette</p>
            <p className={`text-2xl font-bold ${totalMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalMargin.toFixed(0)}€
            </p>
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-sm">Aucune vente enregistrée</p>
            <button
              onClick={() => router.push('/products')}
              className="mt-3 text-xs text-emerald-400 hover:underline"
            >
              Voir le stock →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sales.map(s => {
              const margin = saleMargin(s.products, s)
              return (
                <div key={s.id} className="bg-[#161920] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3">
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
