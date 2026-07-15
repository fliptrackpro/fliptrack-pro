'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'
import { useToast } from '@/components/Toast'

function daysSince(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - d) / (1000 * 60 * 60 * 24))
}

export default function ProductsPage() {
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState('tous')
  const [search, setSearch] = useState('')
  const router = useRouter()
  const toast = useToast()

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
    if (error) return toast('Erreur : ' + error.message)
    setProducts(products.filter(p => p.id !== id))
    toast('Produit supprimé', 'success')
  }

  const filtered = products
    .filter(p => filter === 'tous' ? true : p.status === filter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  if (!user) return (
    <div className="min-h-screen bg-[#f5f2ec] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#6d5ce6] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f2ec] text-[#241f2e] md:pl-56">
      <Nav />

      <header className="flex items-center justify-between px-4 sm:px-6 py-5 border-b border-[#eae5f0]">
        <div>
          <h1 className="text-xl font-serif italic">Stock</h1>
          <p className="text-[#8b8496] text-xs mt-0.5">{products.length} produit{products.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => router.push('/products/new')}
          className="text-xs bg-[#241f2e] hover:bg-[#3a3347] active:scale-[0.98] text-white font-semibold px-4 py-2 rounded-full transition"
        >
          + Ajouter
        </button>
      </header>

      <main className="px-4 sm:px-6 py-6 pb-24 md:pb-6 flex flex-col gap-4 max-w-3xl mx-auto w-full">

        {/* Recherche */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full bg-white border border-[#eae5f0] rounded-xl px-4 py-2.5 text-[#241f2e] placeholder-[#b3aebf] focus:outline-none focus:border-[#6d5ce6] transition text-sm"
        />

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
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                filter === f.key ? 'bg-[#6d5ce6]/10 text-[#6d5ce6]' : 'text-[#8b8496] hover:bg-[#6d5ce6]/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#b3aebf] text-sm">Aucun produit dans cette catégorie</p>
            <button
              onClick={() => router.push('/products/new')}
              className="mt-3 text-xs text-[#6d5ce6] hover:underline"
            >
              Ajouter un produit →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((p, i) => (
              <div
                key={p.id}
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#241f2e]/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 ml-1" style={{ backgroundColor: p.status === 'stock' ? '#4a8a6f' : '#c3bcf0' }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#241f2e] truncate">{p.name}</p>
                    <p className="text-xs text-[#8b8496]">{p.category || 'Sans catégorie'} · {p.condition || 'État non précisé'}</p>
                    {p.status === 'stock' && (
                      <p className={`text-[11px] mt-0.5 ${!p.last_reposted_at || daysSince(p.last_reposted_at) >= 14 ? 'text-[#e0654a]' : 'text-[#b3aebf]'}`}>
                        {p.last_reposted_at ? `Reposté il y a ${daysSince(p.last_reposted_at)}j` : 'Jamais reposté'}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#241f2e] flex-shrink-0 sm:hidden">{p.purchase_price}€</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                  <p className="hidden sm:block text-sm font-semibold text-[#241f2e]">{p.purchase_price}€</p>
                  <button
                    onClick={() => router.push(`/products/${p.id}/edit`)}
                    className="text-xs bg-[#f5f2ec] text-[#655e72] hover:bg-[#e5e0f7] font-medium px-3 py-1.5 rounded-full transition"
                  >
                    Modifier
                  </button>
                  {p.status === 'stock' ? (
                    <>
                      <button
                        onClick={() => router.push(`/products/${p.id}/publish`)}
                        className="text-xs bg-[#f5f2ec] text-[#655e72] hover:bg-[#e5e0f7] font-medium px-3 py-1.5 rounded-full transition"
                      >
                        Publier
                      </button>
                      <button
                        onClick={() => router.push(`/products/${p.id}/sell`)}
                        className="text-xs bg-[#6d5ce6]/10 text-[#6d5ce6] hover:bg-[#6d5ce6]/20 font-medium px-3 py-1.5 rounded-full transition"
                      >
                        Vendre
                      </button>
                    </>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-[#eae5f0] text-[#8b8496]">Vendu</span>
                  )}
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs text-[#c3bcf0] hover:text-[#e0654a] px-2 py-1.5 rounded-full hover:bg-[#e0654a]/10 transition"
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
