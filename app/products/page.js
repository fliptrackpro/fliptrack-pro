'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'
import { useToast } from '@/components/Toast'
import { friendlyError } from '@/lib/errors'
import ImportCsvModal from '@/components/ImportCsvModal'
import ConfirmDialog from '@/components/ConfirmDialog'

function daysSince(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - d) / (1000 * 60 * 60 * 24))
}

// Le stock peut grandir : on charge par pages plutôt que la table entière.
const PAGE_SIZE = 50

export default function ProductsPage() {
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('tous')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const router = useRouter()
  const toast = useToast()

  // Filtre et recherche sont appliqués côté serveur : sinon une recherche ne porterait
  // que sur la page déjà chargée, ce qui masquerait des articles sans prévenir.
  const fetchPage = async (userId, offset, { term, status }) => {
    let q = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)

    // Les articles "en commande" (pas encore reçus) vivent dans la page Commandes
    q = status === 'tous' ? q.neq('status', 'commande') : q.eq('status', status)
    if (term) q = q.ilike('name', `%${term}%`)

    const { data, count } = await q
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    return { rows: data || [], count: count ?? 0 }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return router.push('/login')
      setUser(user)
    })
  }, [router])

  // Anti-rebond : on ne requête pas à chaque frappe
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Premier chargement, et rechargement quand le filtre ou la recherche change
  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    fetchPage(user.id, 0, { term: debouncedSearch, status: filter }).then(({ rows, count }) => {
      if (cancelled) return
      setProducts(rows)
      setTotal(count)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [user, filter, debouncedSearch])

  const refresh = () => {
    if (!user) return
    fetchPage(user.id, 0, { term: debouncedSearch, status: filter }).then(({ rows, count }) => {
      setProducts(rows)
      setTotal(count)
    })
  }

  const loadMore = async () => {
    if (!user || loadingMore) return
    setLoadingMore(true)
    const { rows, count } = await fetchPage(user.id, products.length, { term: debouncedSearch, status: filter })
    setProducts(list => [...list, ...rows])
    setTotal(count)
    setLoadingMore(false)
  }

  // Le bouton "retour" du navigateur peut restaurer cette page depuis le cache (bfcache) sans
  // ré-exécuter le JS : la recherche et la liste restent figées telles qu'avant de partir
  // ajouter un produit. On force un rafraîchissement dans ce cas précis.
  useEffect(() => {
    const handlePageShow = (e) => {
      if (!e.persisted) return
      setSearch('')
      setFilter('tous')
      setDebouncedSearch('')
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [])

  const handleDelete = async () => {
    const p = pendingDelete
    if (!p) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    setPendingDelete(null)
    if (error) return toast(friendlyError(error))
    setProducts(list => list.filter(x => x.id !== p.id))
    setTotal(t => Math.max(t - 1, 0))
    toast('Produit supprimé', 'success')
  }

  const filtered = products
  const hasMore = products.length < total
  const isFiltering = !!debouncedSearch || filter !== 'tous'

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
          <h1 className="text-xl font-serif italic">Stock</h1>
          <p className="text-muted text-xs mt-0.5">
            {isFiltering
              ? `${total} résultat${total > 1 ? 's' : ''}`
              : `${total} produit${total > 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="text-xs bg-surface hover:bg-canvas text-muted2 border border-line font-medium px-4 py-2 rounded-full transition"
          >
            Importer CSV
          </button>
          <button
            onClick={() => router.push('/products/new')}
            className="text-xs bg-inkd hover:bg-inkdh active:scale-[0.98] text-white font-semibold px-4 py-2 rounded-full transition"
          >
            + Ajouter
          </button>
        </div>
      </header>

      {showImport && (
        <ImportCsvModal
          onClose={() => setShowImport(false)}
          onImported={refresh}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        destructive
        title="Supprimer cet article ?"
        message={pendingDelete ? `« ${pendingDelete.name} » et ses ventes associées seront définitivement supprimés.` : ''}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <main className="px-4 sm:px-6 py-6 pb-24 md:pb-6 flex flex-col gap-4 max-w-3xl mx-auto w-full">

        {/* Recherche */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-ink placeholder-faint focus:outline-none focus:border-accent transition text-sm"
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
                filter === f.key ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-accent/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          // Squelettes plutôt qu'un spinner : la page garde sa forme pendant le chargement
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-surface rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg animate-shimmer flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-3 w-2/5 rounded-full animate-shimmer mb-2" />
                  <div className="h-2.5 w-3/5 rounded-full animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted text-sm">
              {debouncedSearch
                ? `Aucun article ne correspond à « ${debouncedSearch} »`
                : 'Aucun produit dans cette catégorie'}
            </p>
            <button
              onClick={() => router.push('/products/new')}
              className="mt-3 text-xs text-accent hover:underline"
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
                className="animate-rise-in bg-surface rounded-2xl shadow-sm shadow-inkd/5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-inkd/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.photo_url ? (
                    <img loading="lazy" decoding="async" src={p.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-1 ${p.status === 'stock' ? 'bg-sage' : 'bg-disabled'}`} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                    <p className="text-xs text-muted">{p.category || 'Sans catégorie'} · {p.condition || 'État non précisé'}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {p.status === 'stock' && (
                        <p className={`text-[11px] ${!p.last_reposted_at || daysSince(p.last_reposted_at) >= 14 ? 'text-coral' : 'text-faint'}`}>
                          {p.last_reposted_at ? `Reposté il y a ${daysSince(p.last_reposted_at)}j` : 'Jamais reposté'}
                        </p>
                      )}
                      {p.estimated_price_min != null && (
                        <span className="text-[11px] bg-sagebg text-sage font-medium px-1.5 py-0.5 rounded-full">
                          Est. {p.estimated_price_min}–{p.estimated_price_max}€
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-ink flex-shrink-0 sm:hidden">{p.purchase_price}€</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                  <p className="hidden sm:block text-sm font-semibold text-ink">{p.purchase_price}€</p>
                  <button
                    onClick={() => router.push(`/products/${p.id}/edit`)}
                    className="text-xs bg-canvas text-muted2 hover:bg-violetbg2 font-medium px-3 py-1.5 rounded-full transition"
                  >
                    Modifier
                  </button>
                  {p.status === 'stock' ? (
                    <>
                      <button
                        onClick={() => router.push(`/products/${p.id}/publish`)}
                        className="text-xs bg-canvas text-muted2 hover:bg-violetbg2 font-medium px-3 py-1.5 rounded-full transition"
                      >
                        Publier
                      </button>
                      <button
                        onClick={() => router.push(`/products/${p.id}/sell`)}
                        className="text-xs bg-accent/10 text-accent hover:bg-accent/20 font-medium px-3 py-1.5 rounded-full transition"
                      >
                        Vendre
                      </button>
                    </>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-line text-muted">Vendu</span>
                  )}
                  <button
                    onClick={() => setPendingDelete(p)}
                    aria-label={`Supprimer ${p.name}`}
                    className="text-muted hover:text-coral rounded-full hover:bg-coral/10 transition inline-flex items-center justify-center min-w-[44px] min-h-[44px]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-2 w-full bg-surface hover:bg-line border border-line text-muted2 font-semibold rounded-xl px-4 py-3 transition text-sm min-h-[44px] disabled:opacity-60"
              >
                {loadingMore ? 'Chargement...' : `Charger plus (${total - products.length} restant${total - products.length > 1 ? 's' : ''})`}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
