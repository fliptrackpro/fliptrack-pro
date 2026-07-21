'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { saleMargin } from '@/lib/margin'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'
import { useToast } from '@/components/Toast'
import { friendlyError } from '@/lib/errors'
import ConfirmDialog from '@/components/ConfirmDialog'

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
  const [pendingCancel, setPendingCancel] = useState(null)
  const router = useRouter()
  const toast = useToast()

  const handleCancelSale = async () => {
    const sale = pendingCancel
    if (!sale) return
    setPendingCancel(null)

    const { error: deleteError } = await supabase
      .from('sales')
      .delete()
      .eq('id', sale.id)
      .eq('user_id', user.id)
    if (deleteError) return toast(friendlyError(deleteError))

    if (sale.product_id) {
      const { error: productError } = await supabase
        .from('products')
        .update({ status: 'stock' })
        .eq('id', sale.product_id)
        .eq('user_id', user.id)
      if (productError) return toast(friendlyError(productError))
    }

    setSales(s => s.filter(x => x.id !== sale.id))
    toast('Vente annulée, article de retour en stock', 'success')
  }

  const loadSales = async (userId) => {
    const { data } = await supabase
      .from('sales')
      .select('*, products(*)')
      .eq('user_id', userId)
      .order('sale_date', { ascending: false })
    setSales(data || [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setUser(user)
      await loadSales(user.id)
    }
    init()
  }, [router])

  // Cf. app/products/page.js : le bouton "retour" du navigateur peut restaurer cette page
  // depuis le cache (bfcache) avec une recherche et des données figées.
  useEffect(() => {
    const handlePageShow = (e) => {
      if (!e.persisted) return
      setSearch('')
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) loadSales(user.id)
      })
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  const filtered = sales.filter(s => (s.products?.name || '').toLowerCase().includes(search.toLowerCase()))

  const totalRevenue = filtered.reduce((acc, s) => acc + (s.sale_price || 0), 0)
  const totalMargin = filtered.reduce((acc, s) => acc + saleMargin(s.products, s), 0)

  if (!user) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas text-ink md:pl-56">
      <Nav />

      <header className="flex items-center justify-between px-4 sm:px-6 py-5 border-b border-line">
        <div>
          <h1 className="text-xl font-serif italic">Ventes</h1>
          <p className="text-muted text-xs mt-0.5">{sales.length} vente{sales.length > 1 ? 's' : ''}</p>
        </div>
        {sales.length > 0 && (
          <button
            onClick={() => exportCSV(filtered)}
            className="text-xs bg-surface hover:bg-canvas text-muted2 border border-line font-medium px-4 py-2 rounded-full transition"
          >
            Exporter CSV
          </button>
        )}
      </header>

      <main className="px-4 sm:px-6 py-6 pb-24 md:pb-6 flex flex-col gap-4 max-w-3xl mx-auto w-full">

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-4">
            <p className="text-muted text-xs mb-2">CA Total</p>
            <p className="text-2xl font-serif text-ink">{totalRevenue.toFixed(0)}€</p>
          </div>
          <div className="bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-4">
            <p className="text-muted text-xs mb-2">Marge Nette</p>
            <p className={`text-2xl font-serif ${totalMargin >= 0 ? 'text-sage' : 'text-coral'}`}>
              {totalMargin.toFixed(0)}€
            </p>
          </div>
        </div>

        {sales.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une vente..."
            className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-ink placeholder-faint focus:outline-none focus:border-accent transition text-sm"
          />
        )}

        {sales.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-faint text-sm">Aucune vente enregistrée</p>
            <button
              onClick={() => router.push('/products')}
              className="mt-3 text-xs text-accent hover:underline"
            >
              Voir le stock →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-faint text-sm">Aucune vente ne correspond à ta recherche</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((s, i) => {
              const margin = saleMargin(s.products, s)
              return (
                <div
                  key={s.id}
                  style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                  className="animate-rise-in bg-surface rounded-2xl shadow-sm shadow-inkd/5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-inkd/10 p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{s.products?.name || 'Produit supprimé'}</p>
                    <p className="text-xs text-muted">{s.platform || 'Plateforme non précisée'} · {s.sale_date}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink">{s.sale_price}€</p>
                      <p className={`text-xs ${margin >= 0 ? 'text-sage' : 'text-coral'}`}>
                        {margin >= 0 ? '+' : ''}{margin.toFixed(2)}€ marge
                      </p>
                    </div>
                    <button
                      onClick={() => setPendingCancel(s)}
                      className="text-xs text-disabled hover:text-coral px-2 py-1.5 rounded-full hover:bg-coral/10 transition"
                      title="Annuler la vente"
                    >
                      ↩
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <ConfirmDialog
        open={!!pendingCancel}
        title="Annuler cette vente ?"
        message={pendingCancel ? `« ${pendingCancel.products?.name || 'Cet article'} » repassera en stock et la vente sera effacée de ton historique.` : ''}
        confirmLabel="Annuler la vente"
        cancelLabel="Revenir"
        onConfirm={handleCancelSale}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  )
}
