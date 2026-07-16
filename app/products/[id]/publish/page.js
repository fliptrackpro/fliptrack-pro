'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/components/Toast'
import Logo from '@/components/Logo'

const PLATFORMS = [
  { key: 'vinted', label: 'Vinted', color: 'bg-teal-50 text-teal-700 border-teal-200', url: 'https://www.vinted.fr/items/new' },
  { key: 'leboncoin', label: 'Leboncoin', color: 'bg-orange-50 text-orange-700 border-orange-200', url: 'https://www.leboncoin.fr/deposer-une-annonce' },
  { key: 'facebook', label: 'Facebook Marketplace', color: 'bg-blue-50 text-blue-700 border-blue-200', url: 'https://www.facebook.com/marketplace/create/item' },
  { key: 'ebay', label: 'eBay', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', url: 'https://www.ebay.fr/sl/sell' },
  { key: 'vestiaire', label: 'Vestiaire Collective', color: 'bg-purple-50 text-purple-700 border-purple-200', url: 'https://www.vestiairecollective.com/' },
]

function daysSince(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - d) / (1000 * 60 * 60 * 24))
}

export default function PublishProduct() {
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [price, setPrice] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [listings, setListings] = useState(null)
  const [copiedKey, setCopiedKey] = useState('')
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (error || !data) return router.push('/products')
      setProduct(data)
      if (data.estimated_price_min != null && data.estimated_price_max != null) {
        setPrice(String(Math.round((data.estimated_price_min + data.estimated_price_max) / 2)))
      }
    }
    load()
  }, [params.id, router])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setListings(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          name: product.name,
          category: product.category,
          condition: product.condition,
          price: parseFloat(price),
          description: product.description,
          photo_url: product.photo_url,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur inconnue')
      } else {
        setListings(data)
      }
    } catch (err) {
      setError('Erreur : ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = (fieldKey, text) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(fieldKey)
    setTimeout(() => setCopiedKey(''), 2000)
  }

  const handleMarkReposted = async () => {
    setMarking(true)
    const now = new Date().toISOString()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('products')
      .update({ last_reposted_at: now })
      .eq('id', product.id)
      .eq('user_id', user?.id)
    if (error) {
      toast('Erreur : ' + error.message)
    } else {
      setProduct(p => ({ ...p, last_reposted_at: now }))
      toast('Marqué comme reposté', 'success')
    }
    setMarking(false)
  }

  const inputClass = "w-full bg-white border border-[#eae5f0] rounded-xl px-4 py-3 text-[#241f2e] placeholder-[#b3aebf] focus:outline-none focus:border-[#6d5ce6] transition text-sm"
  const labelClass = "text-xs font-semibold text-[#8b8496] uppercase tracking-wider"

  if (!product) return (
    <div className="min-h-screen bg-[#f5f2ec] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#6d5ce6] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f2ec] text-[#241f2e]">

      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#eae5f0] px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/products')}
            className="w-8 h-8 rounded-lg hover:bg-[#f5f2ec] flex items-center justify-center text-[#8b8496] transition text-sm flex-shrink-0"
          >
            ←
          </button>
          <span className="hidden sm:inline text-sm text-[#8b8496]">Stock</span>
          <span className="hidden sm:inline text-sm text-[#d6cfe8]">/</span>
          <span className="text-sm font-medium text-[#4a4356] truncate">Publier</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="hover:opacity-70 transition">
          <Logo markClass="w-6 h-6" textClass="text-lg" />
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-serif italic text-[#241f2e]">Publier « {product.name} »</h2>
          <p className="text-[#8b8496] text-sm mt-1">Génère un titre et un descriptif adaptés à chaque plateforme</p>
          <p className="text-xs mt-2">
            {product.last_reposted_at ? (
              <span className="text-[#8b8496]">Reposté il y a {daysSince(product.last_reposted_at)} jour{daysSince(product.last_reposted_at) > 1 ? 's' : ''}</span>
            ) : (
              <span className="text-[#e0654a] font-medium">Jamais reposté</span>
            )}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-6 md:p-8 flex flex-col gap-6">
          {(product.photo_urls?.length > 0 ? product.photo_urls : product.photo_url ? [product.photo_url] : []).length > 0 && (
            <div className="flex flex-col gap-2">
              <label className={labelClass}>
                {(product.photo_urls?.length || (product.photo_url ? 1 : 0)) > 1 ? 'Photos' : 'Photo'}
              </label>
              <div className="flex flex-wrap gap-3">
                {(product.photo_urls?.length > 0 ? product.photo_urls : [product.photo_url]).map((url, i) => (
                  <div key={url} className="flex flex-col items-center gap-1.5">
                    <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                    <a
                      href={url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] bg-[#f5f2ec] hover:bg-[#e5e0f7] text-[#655e72] font-medium px-2 py-1 rounded-full transition"
                    >
                      Télécharger
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Prix de vente visé</label>
            <div className="relative">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                placeholder="0"
                className={`${inputClass} pr-8`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3aebf] text-sm">€</span>
            </div>
            {product.estimated_price_min != null && (
              <p className="text-xs text-[#4a8a6f]">Préremplis avec l'estimation IA ({product.estimated_price_min}–{product.estimated_price_max}€), ajuste si besoin.</p>
            )}
          </div>

          {error && <p className="text-xs text-[#e0654a]">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={generating || !price}
            className="w-full bg-[#241f2e] hover:bg-[#3a3347] active:scale-[0.98] disabled:bg-[#eae5f0] disabled:text-[#c3bcf0] text-white font-semibold rounded-xl px-4 py-3.5 transition text-sm"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                Génération en cours...
              </span>
            ) : (
              'Générer les annonces →'
            )}
          </button>
        </div>

        {listings && (
          <div className="flex flex-col gap-4 mt-6">
            {PLATFORMS.filter(p => p.key !== 'vestiaire' || product.is_luxury).map(p => {
              const listing = listings[p.key]
              if (!listing) return null
              const hashtagLine = listing.hashtags?.length ? listing.hashtags.map(h => `#${h}`).join(' ') : null
              return (
                <div key={p.key} className="bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border w-fit ${p.color}`}>
                      {p.label}
                    </span>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-[#6d5ce6]/10 hover:bg-[#6d5ce6]/20 text-[#6d5ce6] font-medium px-3 py-1.5 rounded-full transition w-fit"
                    >
                      Ouvrir {p.label} ↗
                    </a>
                  </div>

                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-[#241f2e]">{listing.title}</p>
                    <button
                      onClick={() => handleCopy(`${p.key}-title`, listing.title)}
                      className="text-[11px] flex-shrink-0 bg-[#f5f2ec] hover:bg-[#e5e0f7] text-[#655e72] font-medium px-2.5 py-1 rounded-full transition"
                    >
                      {copiedKey === `${p.key}-title` ? '✓ Copié' : 'Copier le titre'}
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-2 mt-2">
                    <p className="text-sm text-[#655e72] whitespace-pre-line">{listing.description}</p>
                    <button
                      onClick={() => handleCopy(`${p.key}-desc`, listing.description)}
                      className="text-[11px] flex-shrink-0 bg-[#f5f2ec] hover:bg-[#e5e0f7] text-[#655e72] font-medium px-2.5 py-1 rounded-full transition"
                    >
                      {copiedKey === `${p.key}-desc` ? '✓ Copié' : 'Copier le texte'}
                    </button>
                  </div>

                  {hashtagLine && (
                    <div className="flex items-start justify-between gap-2 mt-3 pt-3 border-t border-[#f0edf8]">
                      <p className="text-xs text-[#6d5ce6]">{hashtagLine}</p>
                      <button
                        onClick={() => handleCopy(`${p.key}-tags`, hashtagLine)}
                        className="text-[11px] flex-shrink-0 bg-[#f5f2ec] hover:bg-[#e5e0f7] text-[#655e72] font-medium px-2.5 py-1 rounded-full transition"
                      >
                        {copiedKey === `${p.key}-tags` ? '✓ Copié' : 'Copier les hashtags'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            <div className="bg-white rounded-2xl p-5 shadow-sm shadow-[#241f2e]/5 flex flex-col gap-3">
              <p className="text-sm text-[#655e72]">
                Colle ce texte directement sur le site de ton choix. Une fois l'annonce republiée (ou "bumpée") sur Vinted, marque-le ici pour garder trace de la fraîcheur de ton annonce.
              </p>
              <button
                onClick={handleMarkReposted}
                disabled={marking}
                className="w-full bg-[#4a8a6f] hover:bg-[#3e7a5f] active:scale-[0.98] disabled:bg-[#eae5f0] disabled:text-[#c3bcf0] text-white font-semibold rounded-xl px-4 py-3 transition text-sm"
              >
                {marking ? 'Enregistrement...' : '✓ Marquer comme reposté'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
