'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

const PLATFORMS = [
  { key: 'vinted', label: 'Vinted', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20', url: 'https://www.vinted.fr/items/new' },
  { key: 'leboncoin', label: 'Leboncoin', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', url: 'https://www.leboncoin.fr/deposer-une-annonce' },
  { key: 'facebook', label: 'Facebook Marketplace', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', url: 'https://www.facebook.com/marketplace/create/item' },
]

export default function PublishProduct() {
  const router = useRouter()
  const params = useParams()
  const [product, setProduct] = useState(null)
  const [price, setPrice] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [listings, setListings] = useState(null)
  const [copiedKey, setCopiedKey] = useState('')

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
    }
    load()
  }, [params.id, router])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setListings(null)
    try {
      const res = await fetch('/api/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          category: product.category,
          condition: product.condition,
          price: parseFloat(price),
          description: product.description,
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

  const handleCopy = (key, title, description) => {
    navigator.clipboard.writeText(`${title}\n\n${description}`)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 2000)
  }

  const inputClass = "w-full bg-[#0d0f14] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-400 transition text-sm"
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wider"

  if (!product) return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white">

      <header className="sticky top-0 z-10 bg-[#111318] border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/products')}
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 transition text-sm"
          >
            ←
          </button>
          <span className="text-sm text-gray-500">Stock</span>
          <span className="text-sm text-gray-700">/</span>
          <span className="text-sm font-medium text-gray-300">Publier</span>
        </div>
        <span className="text-lg font-bold text-white">
          Flip<span className="text-indigo-400">Track</span>
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Publier « {product.name} »</h2>
          <p className="text-gray-500 text-sm mt-1">Génère un titre et un descriptif adaptés à chaque plateforme</p>
        </div>

        <div className="bg-[#161920] rounded-2xl border border-white/5 p-6 md:p-8 flex flex-col gap-6">
          {product.photo_url && (
            <div className="flex items-center gap-4">
              <img src={product.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
              <a
                href={product.photo_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 font-medium px-3 py-1.5 rounded-lg transition"
              >
                Télécharger la photo
              </a>
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
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleGenerate}
            disabled={generating || !price}
            className="w-full bg-indigo-500 hover:bg-indigo-400 active:scale-[0.98] disabled:bg-white/5 disabled:text-gray-600 text-white font-semibold rounded-xl px-4 py-3.5 transition text-sm"
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
            {PLATFORMS.map(p => {
              const listing = listings[p.key]
              if (!listing) return null
              return (
                <div key={p.key} className="bg-[#161920] rounded-2xl border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${p.color}`}>
                      {p.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(p.key, listing.title, listing.description)}
                        className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 font-medium px-3 py-1.5 rounded-lg transition"
                      >
                        {copiedKey === p.key ? '✓ Copié' : 'Copier'}
                      </button>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-medium px-3 py-1.5 rounded-lg transition"
                      >
                        Ouvrir {p.label} ↗
                      </a>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-white mb-1.5">{listing.title}</p>
                  <p className="text-sm text-gray-400 whitespace-pre-line">{listing.description}</p>
                </div>
              )
            })}

            <div className="bg-white/5 rounded-2xl p-5 text-sm text-gray-400">
              Colle ce texte directement sur le site de ton choix. Tu peux aussi me demander de remplir l'annonce à ta place en direct dans le navigateur, étape par étape.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
