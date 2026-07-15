'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'

export default function ProductsPage() {
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState('tous')
  const router = useRouter()

  const load = async (userId) => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setProducts(data || [])
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

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce produit et ses ventes associées ?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return alert('Erreur : ' + error.message)
    setProducts(products.filter(p => p.id !== id))
  }

  const filtered = products.filter(p => filter === 'tous' ? true : p.status === filter)

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
          <h1 className="text-xl font-bold">Stock</h1>
          <p className="text-gray-500 text-xs mt-0.5">{products.length} produit{products.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => router.push('/products/new')}
          className="text-xs bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-4 py-2 rounded-lg transition"
        >
          + Ajouter
        </button>
      </header>

      <main className="px-6 py-6 pb-24 md:pb-6 flex flex-col gap-4">

        {/* Filtres */}
        <div className="flex gap-2">
          {[
            { key: 'tous', label: 'Tous' },
            { key: 'stock', label: 'En stock' },
            { key: 'vendu', label: 'Vendus' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                filter === f.key ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-500 hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-sm">Aucun produit dans cette catégorie</p>
            <button
              onClick={() => router.push('/products/new')}
              className="mt-3 text-xs text-emerald-400 hover:underline"
            >
              Ajouter un produit →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(p => (
              <div key={p.id} className="bg-[#161920] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === 'stock' ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.category || 'Sans catégorie'} · {p.condition || 'État non précisé'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-sm font-semibold text-white">{p.purchase_price}€</p>
                  {p.status === 'stock' ? (
                    <button
                      onClick={() => router.push(`/products/${p.id}/sell`)}
                      className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 font-medium px-3 py-1.5 rounded-lg transition"
                    >
                      Vendre
                    </button>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-400">Vendu</span>
                  )}
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs text-gray-600 hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
