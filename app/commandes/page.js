'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'
import { useToast } from '@/components/Toast'

function fmtDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Étapes d'expédition d'une vente et libellé du bouton pour passer à la suivante
const SHIP_FLOW = {
  to_ship: { label: 'À expédier', next: 'shipped', nextLabel: "Marquer expédié", color: 'bg-[#e0654a]/10 text-[#e0654a]' },
  shipped: { label: 'Expédié', next: 'delivered', nextLabel: 'Marquer livré', color: 'bg-[#6d5ce6]/10 text-[#6d5ce6]' },
}

export default function CommandesPage() {
  const [user, setUser] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const toast = useToast()

  const load = async (userId) => {
    const [{ data: prods }, { data: sales }] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', userId).eq('status', 'commande').order('expected_delivery_date', { ascending: true }),
      supabase.from('sales').select('*, products(name)').eq('user_id', userId).in('shipping_status', ['to_ship', 'shipped']).order('sale_date', { ascending: true }),
    ])
    setPurchases(prods || [])
    setShipments(sales || [])
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setUser(user)
      await load(user.id)
    }
    init()
  }, [router])

  const markReceived = async (product) => {
    const { error } = await supabase
      .from('products')
      .update({ status: 'stock', purchase_date: new Date().toISOString().split('T')[0] })
      .eq('id', product.id)
      .eq('user_id', user.id)
    if (error) return toast('Erreur : ' + error.message)
    setPurchases(p => p.filter(x => x.id !== product.id))
    toast(`« ${product.name} » est reçu et ajouté au stock`, 'success')
  }

  const advanceShipment = async (sale) => {
    const flow = SHIP_FLOW[sale.shipping_status]
    if (!flow) return
    const patch = { shipping_status: flow.next }
    if (flow.next === 'shipped') patch.shipped_at = new Date().toISOString()

    const { error } = await supabase.from('sales').update(patch).eq('id', sale.id).eq('user_id', user.id)
    if (error) return toast('Erreur : ' + error.message)

    if (flow.next === 'delivered') {
      // Livré = terminé, on le sort de la liste des expéditions en cours
      await supabase.from('sales').update({ shipping_status: 'completed' }).eq('id', sale.id).eq('user_id', user.id)
      setShipments(s => s.filter(x => x.id !== sale.id))
      toast('Vente livrée et finalisée', 'success')
    } else {
      setShipments(s => s.map(x => x.id === sale.id ? { ...x, shipping_status: flow.next } : x))
      toast('Statut mis à jour', 'success')
    }
  }

  if (!user || loading) return (
    <div className="min-h-screen bg-[#f5f2ec] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#6d5ce6] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const empty = purchases.length === 0 && shipments.length === 0

  return (
    <div className="min-h-screen bg-[#f5f2ec] text-[#241f2e] md:pl-56">
      <Nav />

      <header className="flex items-center justify-between px-4 sm:px-6 py-5 border-b border-[#eae5f0]">
        <div>
          <h1 className="text-xl font-serif italic">Commandes</h1>
          <p className="text-[#8b8496] text-xs mt-0.5">Achats en route et ventes à expédier</p>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 pb-24 md:pb-6 flex flex-col gap-8 max-w-3xl mx-auto w-full">

        {empty && (
          <div className="text-center py-16">
            <p className="text-[#b3aebf] text-sm">Rien en attente pour le moment.</p>
            <p className="text-[#b3aebf] text-xs mt-1">Coche « en commande » à l'ajout d'un article, ou « à expédier » lors d'une vente.</p>
          </div>
        )}

        {/* Achats en attente de réception */}
        {purchases.length > 0 && (
          <section className="animate-rise-in">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold">Achats en route</h2>
              <span className="text-xs bg-[#6d5ce6]/10 text-[#6d5ce6] font-semibold px-2 py-0.5 rounded-full">{purchases.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {purchases.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-[#8b8496]">
                      {p.purchase_price}€
                      {p.expected_delivery_date ? ` · livraison estimée ${fmtDate(p.expected_delivery_date)}` : ' · sans date de livraison'}
                    </p>
                  </div>
                  <button
                    onClick={() => markReceived(p)}
                    className="text-xs bg-[#4a8a6f] hover:bg-[#3e7a5f] active:scale-[0.98] text-white font-semibold px-3 py-2 rounded-full transition flex-shrink-0"
                  >
                    Marquer reçu
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ventes à expédier */}
        {shipments.length > 0 && (
          <section className="animate-rise-in">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-bold">Ventes à expédier</h2>
              <span className="text-xs bg-[#e0654a]/10 text-[#e0654a] font-semibold px-2 py-0.5 rounded-full">{shipments.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {shipments.map(s => {
                const flow = SHIP_FLOW[s.shipping_status]
                return (
                  <div key={s.id} className="bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.products?.name || 'Article vendu'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${flow?.color || ''}`}>{flow?.label}</span>
                        <span className="text-xs text-[#8b8496]">{s.sale_price}€{s.platform ? ` · ${s.platform}` : ''}</span>
                      </div>
                    </div>
                    {flow && (
                      <button
                        onClick={() => advanceShipment(s)}
                        className="text-xs bg-[#241f2e] hover:bg-[#3a3347] active:scale-[0.98] text-white font-semibold px-3 py-2 rounded-full transition flex-shrink-0"
                      >
                        {flow.nextLabel}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}
