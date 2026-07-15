'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { CameraIcon, BarcodeIcon, SparkleIcon } from '@/components/icons'

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function guessCategory(text, categories) {
  const t = (text || '').toLowerCase()
  const map = {
    'Vêtements': ['clothing', 'apparel', 'shirt', 'jacket', 'vêtement'],
    'Chaussures': ['shoe', 'sneaker', 'boot', 'chaussure'],
    'Électronique': ['electronic', 'phone', 'computer', 'audio', 'camera'],
    'Jeux vidéo': ['video game', 'game', 'console', 'jeu'],
    'Maison': ['home', 'kitchen', 'furniture', 'maison'],
    'Sport': ['sport', 'fitness', 'outdoor'],
  }
  for (const cat of categories) {
    const keywords = map[cat] || []
    if (keywords.some(k => t.includes(k))) return cat
  }
  return ''
}

export default function NewProduct() {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [estimateError, setEstimateError] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [aiEstimate, setAiEstimate] = useState(null)
  const [description, setDescription] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [form, setForm] = useState({
    name: '',
    category: '',
    condition: '',
    purchase_price: '',
    purchase_fees: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setAiEstimate(null)
    setEstimateError('')
    setEstimating(true)

    try {
      const base64 = await fileToBase64(file)
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEstimateError(data.error || 'Erreur inconnue')
      } else {
        setAiEstimate(data)
        setDescription(data.description || '')
        setForm(f => ({
          ...f,
          name: f.name || data.name || '',
          category: f.category || data.category || '',
          condition: f.condition || data.condition || '',
        }))
      }
    } catch (err) {
      setEstimateError('Erreur lors de l\'analyse : ' + err.message)
    } finally {
      setEstimating(false)
    }
  }

  const handleScan = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
      setScanError("Le scan de code-barres n'est pas supporté par ce navigateur.")
      return
    }

    setScanError('')
    setScanning(true)

    try {
      const bitmap = await createImageBitmap(file)
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
      })
      const barcodes = await detector.detect(bitmap)

      if (!barcodes.length) {
        setScanError('Aucun code-barres détecté sur la photo, réessaie.')
        return
      }

      const code = barcodes[0].rawValue
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`, {
        headers: await authHeaders(),
      })
      const data = await res.json()

      if (!res.ok) {
        setScanError(data.error || 'Produit non trouvé pour ce code-barres.')
        return
      }

      setForm(f => ({
        ...f,
        name: f.name || data.name || '',
        category: f.category || guessCategory(`${data.name} ${data.category}`, categories),
      }))
      toast('Produit trouvé via le code-barres', 'success')
    } catch (err) {
      setScanError('Erreur lors du scan : ' + err.message)
    } finally {
      setScanning(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return router.push('/login')
    }

    let photo_url = null
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('products').upload(path, photoFile)
      if (uploadError) {
        toast('Erreur upload photo : ' + uploadError.message)
        setLoading(false)
        return
      }
      photo_url = supabase.storage.from('products').getPublicUrl(path).data.publicUrl
    }

    const { error } = await supabase.from('products').insert({
      user_id: user.id,
      name: form.name,
      category: form.category,
      condition: form.condition,
      purchase_price: parseFloat(form.purchase_price),
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_fees: parseFloat(form.purchase_fees) || 0,
      status: 'stock',
      description: description || null,
      photo_url,
    })
    if (error) {
      toast('Erreur : ' + error.message)
    } else {
      toast('Produit ajouté', 'success')
      router.push('/products')
    }
    setLoading(false)
  }

  const categories = ['Vêtements', 'Chaussures', 'Électronique', 'Jeux vidéo', 'Maison', 'Sport', 'Autre']
  const conditions = ['Neuf avec étiquette', 'Très bon état', 'Bon état', 'État correct']

  const totalCost = (parseFloat(form.purchase_price || 0) + parseFloat(form.purchase_fees || 0)).toFixed(2)

  const inputClass = "w-full bg-white border border-[#eae5f0] rounded-xl px-4 py-3 text-[#241f2e] placeholder-[#b3aebf] focus:outline-none focus:border-[#6d5ce6] transition text-sm"
  const labelClass = "text-xs font-semibold text-[#8b8496] uppercase tracking-wider"

  return (
    <div className="min-h-screen bg-[#f5f2ec] text-[#241f2e]">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#eae5f0] px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-8 h-8 rounded-lg hover:bg-[#f5f2ec] flex items-center justify-center text-[#8b8496] transition text-sm flex-shrink-0"
          >
            ←
          </button>
          <span className="hidden sm:inline text-sm text-[#8b8496]">Dashboard</span>
          <span className="hidden sm:inline text-sm text-[#d6cfe8]">/</span>
          <span className="text-sm font-medium text-[#4a4356] truncate">Nouveau produit</span>
        </div>
        <span className="text-lg font-serif italic text-[#241f2e]">
          Flip<span className="not-italic font-sans font-bold text-[#6d5ce6]">Track</span>
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-serif italic text-[#241f2e]">Ajouter un produit</h2>
          <p className="text-[#8b8496] text-sm mt-1">Renseigne les informations pour suivre ta marge automatiquement</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-6 md:p-8 flex flex-col gap-6">

          {/* Photo + estimation IA */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Photo (estimation IA)</label>
            <label className="flex items-center gap-4 cursor-pointer bg-[#f5f2ec] border border-dashed border-[#d6cfe8] rounded-xl px-4 py-3 hover:border-[#6d5ce6]/50 transition">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-white flex items-center justify-center">
                  <CameraIcon className="w-6 h-6 text-[#b3aebf]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#4a4356]">{photoPreview ? 'Changer la photo' : 'Ajouter une photo'}</p>
                <p className="text-xs text-[#b3aebf]">L'IA remplit le nom, la catégorie et l'état pour toi</p>
              </div>
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>

            {estimating && (
              <div className="rounded-xl px-4 py-3 mt-1 border border-[#e2ddf5] bg-gradient-to-br from-[#f0edfb] via-[#f3ecf9] to-[#faf0f6]">
                <div className="flex items-center gap-2 text-xs text-[#6d5ce6] mb-3">
                  <SparkleIcon className="w-3.5 h-3.5 animate-pulse" />
                  Analyse de la photo en cours...
                </div>
                <div className="h-3 w-1/3 rounded-full animate-shimmer mb-2" />
                <div className="h-5 w-1/2 rounded-full animate-shimmer mb-3" />
                <div className="h-2.5 w-full rounded-full animate-shimmer mb-1.5" />
                <div className="h-2.5 w-4/5 rounded-full animate-shimmer" />
              </div>
            )}
            {estimateError && (
              <p className="text-xs text-[#e0654a] mt-1">{estimateError}</p>
            )}
            {aiEstimate && !estimating && (
              <div className="animate-rise-in rounded-xl px-4 py-3 mt-1 border border-[#e2ddf5] bg-gradient-to-br from-[#f0edfb] via-[#f3ecf9] to-[#faf0f6]">
                <div className="flex items-center gap-1.5 text-xs text-[#6d5ce6] font-semibold uppercase tracking-wider">
                  <SparkleIcon className="w-3.5 h-3.5" />
                  Valeur de revente estimée
                </div>
                <p className="text-lg font-serif text-[#4a8a6f] mt-1">
                  {aiEstimate.estimated_price_min}€ – {aiEstimate.estimated_price_max}€
                </p>
                <p className="text-xs text-[#655e72] mt-2">{aiEstimate.description}</p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[
                    { label: 'eBay (vendus)', url: `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(form.name || aiEstimate.name || '')}&LH_Sold=1&LH_Complete=1` },
                    { label: 'Vinted', url: `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(form.name || aiEstimate.name || '')}` },
                    { label: 'Leboncoin', url: `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(form.name || aiEstimate.name || '')}` },
                  ].map(l => (
                    <a
                      key={l.label}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] bg-white hover:bg-[#f5f2ec] text-[#655e72] font-medium px-2.5 py-1 rounded-full transition border border-[#eae5f0]"
                    >
                      Vérifier sur {l.label} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scanner code-barres */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-3 cursor-pointer bg-[#f5f2ec] border border-dashed border-[#d6cfe8] rounded-xl px-4 py-3 hover:border-[#6d5ce6]/50 transition">
              <BarcodeIcon className="w-5 h-5 text-[#b3aebf] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#4a4356]">Scanner un code-barres</p>
                <p className="text-xs text-[#b3aebf]">Utile pour les objets encore emballés/scellés</p>
              </div>
              {scanning && (
                <span className="w-4 h-4 border-2 border-[#6d5ce6] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              <input type="file" accept="image/*" capture="environment" onChange={handleScan} className="hidden" />
            </label>
            {scanError && (
              <p className="text-xs text-[#e0654a] mt-1">{scanError}</p>
            )}
          </div>

          <div className="border-t border-[#eae5f0]" />

          {/* Nom */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nom du produit</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ex: Nike Air Max 90 blanche T42"
              className={inputClass}
            />
          </div>

          {/* Categorie + Etat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Catégorie</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Choisir</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>État</label>
              <select
                name="condition"
                value={form.condition}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Choisir</option>
                {conditions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Separateur */}
          <div className="border-t border-[#eae5f0]" />

          {/* Prix + Frais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Prix d'achat</label>
              <div className="relative">
                <input
                  name="purchase_price"
                  value={form.purchase_price}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3aebf] text-sm">€</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Frais d'achat</label>
              <div className="relative">
                <input
                  name="purchase_fees"
                  value={form.purchase_fees}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3aebf] text-sm">€</span>
              </div>
            </div>
          </div>

          {/* Apercu cout total */}
          {form.purchase_price && (
            <div className="bg-[#4a8a6f]/10 border border-[#4a8a6f]/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#4a8a6f] font-semibold uppercase tracking-wider">Coût total</p>
                <p className="text-xs text-[#4a8a6f]/70 mt-0.5">Prix achat + frais</p>
              </div>
              <span className="text-xl font-serif text-[#4a8a6f]">{totalCost} €</span>
            </div>
          )}

          {/* Bouton */}
          <button
            onClick={handleSubmit}
            disabled={loading || !form.name || !form.purchase_price}
            className="w-full bg-[#241f2e] hover:bg-[#3a3347] active:scale-[0.98] disabled:bg-[#eae5f0] disabled:text-[#c3bcf0] text-white font-semibold rounded-xl px-4 py-3.5 transition text-sm mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                Enregistrement...
              </span>
            ) : (
              'Ajouter le produit →'
            )}
          </button>

        </div>
      </main>
    </div>
  )
}
