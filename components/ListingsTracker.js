'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import { friendlyError } from '@/lib/errors'
import ConfirmDialog from '@/components/ConfirmDialog'

const PLATFORMS = [
  { key: 'Vinted', color: 'bg-platvinted/12 text-platvinted border-platvinted/25', create: 'https://www.vinted.fr/items/new' },
  { key: 'Leboncoin', color: 'bg-platlbc/12 text-platlbc border-platlbc/25', create: 'https://www.leboncoin.fr/deposer-une-annonce' },
  { key: 'Facebook Marketplace', color: 'bg-platfb/12 text-platfb border-platfb/25', create: 'https://www.facebook.com/marketplace/create/item' },
  { key: 'eBay', color: 'bg-platebay/12 text-platebay border-platebay/25', create: 'https://www.ebay.fr/sl/sell' },
  { key: 'Vestiaire Collective', color: 'bg-platvc/12 text-platvc border-platvc/25', create: 'https://www.vestiairecollective.com/' },
  { key: 'Autre', color: 'bg-canvas text-muted2 border-line', create: null },
]

function createUrl(name) {
  return PLATFORMS.find(p => p.key === name)?.create || null
}

function platformStyle(name) {
  return (PLATFORMS.find(p => p.key === name)?.color) || 'bg-canvas text-muted2 border-line'
}

function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function ageLabel(dateStr) {
  const d = daysSince(dateStr)
  if (d <= 0) return "aujourd'hui"
  return `il y a ${d} j`
}

export default function ListingsTracker({ productId, defaultPrice }) {
  const toast = useToast()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [platform, setPlatform] = useState('Vinted')
  const [price, setPrice] = useState(defaultPrice ? String(defaultPrice) : '')
  const [url, setUrl] = useState('')
  const [editingUrlId, setEditingUrlId] = useState(null)
  const [editUrlValue, setEditUrlValue] = useState('')
  const [pendingRemove, setPendingRemove] = useState(null)

  const load = async () => {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('product_id', productId)
      .order('listed_at', { ascending: false })
    setListings(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const handleAdd = async () => {
    if (adding) return
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAdding(false); return toast('Session expirée, reconnecte-toi.') }

    const cleanUrl = url.trim()
    const { error } = await supabase.from('listings').insert({
      product_id: productId,
      user_id: user.id,
      platform,
      listed_price: price ? parseFloat(price) : null,
      url: cleanUrl || null,
      status: 'active',
    })
    setAdding(false)
    if (error) return toast(friendlyError(error))
    setUrl('')
    toast('Annonce ajoutée au suivi', 'success')
    load()
  }

  const saveUrl = async (id) => {
    const clean = editUrlValue.trim()
    const { error } = await supabase.from('listings').update({ url: clean || null }).eq('id', id)
    if (error) return toast(friendlyError(error))
    setEditingUrlId(null)
    setEditUrlValue('')
    load()
  }

  const setStatus = async (id, status) => {
    const { error } = await supabase.from('listings').update({ status }).eq('id', id)
    if (error) return toast(friendlyError(error))
    load()
  }

  const remove = async () => {
    const l = pendingRemove
    if (!l) return
    setPendingRemove(null)
    const { error } = await supabase.from('listings').delete().eq('id', l.id)
    if (error) return toast(friendlyError(error))
    load()
  }

  const inputClass = "w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-ink placeholder-faint focus:outline-none focus:border-accent transition text-sm"

  return (
    <div className="bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold">Suivi des annonces</h3>
        <p className="text-xs text-muted mt-0.5">Note où tu as publié cet article pour suivre la fraîcheur de chaque annonce.</p>
      </div>

      {/* Formulaire d'ajout — flux guidé : publier sur la plateforme, puis coller le lien */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputClass}>
            {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.key}</option>)}
          </select>
          <div className="relative w-28 flex-shrink-0">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              placeholder="Prix"
              className={`${inputClass} pr-6`}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint text-sm">€</span>
          </div>
        </div>

        {createUrl(platform) && (
          <a
            href={createUrl(platform)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent font-semibold rounded-xl px-4 py-2.5 transition text-sm"
          >
            1. Publier sur {platform} ↗
          </a>
        )}

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={createUrl(platform) ? "2. Colle ici le lien de ton annonce (optionnel)" : "Lien de l'annonce (optionnel)"}
          className={inputClass}
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="bg-inkd hover:bg-inkdh active:scale-[0.98] disabled:bg-line disabled:text-disabled text-white font-semibold rounded-xl px-4 py-2.5 transition text-sm"
        >
          {adding ? 'Ajout...' : `${createUrl(platform) ? '3. ' : ''}+ Ajouter au suivi`}
        </button>
        <p className="text-[11px] text-faint">
          FlipTrack ne peut pas récupérer le lien automatiquement (les plateformes ne l'exposent pas) : ouvre la plateforme, publie, puis colle l'URL de ton annonce ici.
        </p>
      </div>

      {/* Liste des annonces */}
      {!loading && listings.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          {listings.map(l => (
            <div key={l.id} className={`rounded-xl border px-3 py-2.5 ${l.status === 'active' ? 'bg-canvas border-line' : 'bg-surface border-line opacity-70'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${platformStyle(l.platform)}`}>{l.platform}</span>
                  {l.listed_price != null && <span className="text-xs font-semibold text-ink">{l.listed_price}€</span>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {l.status === 'active' ? (
                    <span className="text-[11px] text-muted">{ageLabel(l.listed_at)}</span>
                  ) : (
                    <span className={`text-[11px] font-medium ${l.status === 'sold' ? 'text-sage' : 'text-faint'}`}>
                      {l.status === 'sold' ? 'Vendue' : 'Retirée'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 mt-2">
                {l.url ? (
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent hover:underline truncate max-w-[45%]">
                    Voir l'annonce ↗
                  </a>
                ) : editingUrlId === l.id ? (
                  <span />
                ) : (
                  <button
                    onClick={() => { setEditingUrlId(l.id); setEditUrlValue('') }}
                    className="text-xs text-muted hover:text-accent transition inline-flex items-center min-h-[44px] pr-2"
                  >
                    + Ajouter le lien
                  </button>
                )}
                <div className="flex items-center gap-1">
                  {l.status === 'active' && (
                    <>
                      <button onClick={() => setStatus(l.id, 'sold')} className="text-xs bg-sage/10 text-sage hover:bg-sage/20 font-medium px-3 rounded-full transition min-h-[44px]">
                        Vendue
                      </button>
                      <button onClick={() => setStatus(l.id, 'expired')} className="text-xs bg-surface border border-line text-muted2 hover:bg-canvas font-medium px-3 rounded-full transition min-h-[44px]">
                        Retirer
                      </button>
                    </>
                  )}
                  {l.status !== 'active' && (
                    <button onClick={() => setStatus(l.id, 'active')} className="text-xs bg-surface border border-line text-muted2 hover:bg-canvas font-medium px-3 rounded-full transition min-h-[44px]">
                      Réactiver
                    </button>
                  )}
                  <button onClick={() => setPendingRemove(l)} aria-label="Supprimer cette annonce du suivi" className="text-muted hover:text-coral rounded-full hover:bg-coral/10 transition inline-flex items-center justify-center min-w-[44px] min-h-[44px]">
                    ✕
                  </button>
                </div>
              </div>

              {editingUrlId === l.id && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    autoFocus
                    value={editUrlValue}
                    onChange={(e) => setEditUrlValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveUrl(l.id) }}
                    placeholder="Colle le lien de l'annonce"
                    className="flex-1 bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink placeholder-faint focus:outline-none focus:border-accent transition"
                  />
                  <button onClick={() => saveUrl(l.id)} className="text-[11px] bg-inkd text-white font-medium px-2.5 py-1.5 rounded-lg">
                    OK
                  </button>
                  <button onClick={() => { setEditingUrlId(null); setEditUrlValue('') }} className="text-[11px] text-muted px-1.5 py-1.5">
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingRemove}
        destructive
        title="Retirer cette annonce du suivi ?"
        message={pendingRemove ? `L'entrée ${pendingRemove.platform}${pendingRemove.listed_price != null ? ` à ${pendingRemove.listed_price}€` : ''} sera supprimée du suivi. Ton annonce sur la plateforme n'est pas affectée.` : ''}
        confirmLabel="Retirer"
        onConfirm={remove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  )
}
