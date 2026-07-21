'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import Logo from '@/components/Logo'
import { CameraIcon, BarcodeIcon, SparkleIcon } from '@/components/icons'
import { compressImage, compressImages } from '@/lib/image'

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
  const [extraPhotos, setExtraPhotos] = useState([])
  const [aiEstimate, setAiEstimate] = useState(null)
  const [description, setDescription] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [assistMessages, setAssistMessages] = useState([])
  const [assistInput, setAssistInput] = useState('')
  const [assistSending, setAssistSending] = useState(false)
  const [isOrder, setIsOrder] = useState(false)
  const [expectedDelivery, setExpectedDelivery] = useState('')
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

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setAiEstimate(null)
    setEstimateError('')
  }

  const handleExtraPhotos = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setExtraPhotos(prev => [...prev, ...files.map(file => ({ file, preview: URL.createObjectURL(file) }))])
    setAiEstimate(null)
    setEstimateError('')
    e.target.value = ''
  }

  const handleEstimate = async () => {
    if (!photoFile) return
    setAiEstimate(null)
    setEstimateError('')
    setEstimating(true)

    try {
      // Compresser avant l'encodage base64 : divise d'autant le payload envoyé à l'IA
      const allFiles = await compressImages([photoFile, ...extraPhotos.map(p => p.file)])
      const images = await Promise.all(allFiles.map(async file => ({
        data: await fileToBase64(file),
        mimeType: file.type,
      })))
      const note = assistMessages.filter(m => m.role === 'user').map(m => m.content).join('. ')
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ images, note }),
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

        const priceText = (data.estimated_price_min != null && data.estimated_price_max != null)
          ? ` Estimation : ${data.estimated_price_min}€ – ${data.estimated_price_max}€.`
          : ''
        setAssistMessages(m => [...m, {
          role: 'assistant',
          content: `J'ai identifié « ${data.name || 'ton article'} » (${data.category || 'catégorie incertaine'}, ${data.condition || 'état à confirmer'}).${priceText} Si je me suis trompé sur la version, l'édition ou l'état, dis-le-moi ici et je corrige la fiche.`,
        }])
      }
    } catch (err) {
      setEstimateError('Erreur lors de l\'analyse : ' + err.message)
    } finally {
      setEstimating(false)
    }
  }

  const handleAssistSend = async () => {
    const text = assistInput.trim()
    if (!text || assistSending) return

    const nextMessages = [...assistMessages, { role: 'user', content: text }]
    setAssistMessages(nextMessages)
    setAssistInput('')
    setAssistSending(true)

    try {
      const res = await fetch('/api/estimate/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ messages: nextMessages, currentForm: form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAssistMessages(m => [...m, { role: 'assistant', content: data.error || 'Erreur, réessaie.' }])
      } else {
        setAssistMessages(m => [...m, { role: 'assistant', content: data.reply || 'Noté.' }])
        const fields = data.fields || {}
        if (fields.name || fields.category || fields.condition) {
          setForm(f => ({
            ...f,
            name: fields.name ?? f.name,
            category: fields.category ?? f.category,
            condition: fields.condition ?? f.condition,
          }))
        }
        if (fields.description) setDescription(fields.description)
        if (fields.estimated_price_min != null || fields.estimated_price_max != null || fields.description || fields.name) {
          setAiEstimate(prev => ({
            estimated_price_min: fields.estimated_price_min ?? prev?.estimated_price_min ?? null,
            estimated_price_max: fields.estimated_price_max ?? prev?.estimated_price_max ?? null,
            description: fields.description || prev?.description || '',
            name: fields.name || prev?.name || '',
            is_luxury: prev?.is_luxury ?? false,
          }))
        }
      }
    } catch (err) {
      setAssistMessages(m => [...m, { role: 'assistant', content: 'Erreur : ' + err.message }])
    } finally {
      setAssistSending(false)
    }
  }

  const removeExtraPhoto = (index) => {
    setExtraPhotos(prev => prev.filter((_, i) => i !== index))
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

    const uploadOne = async (raw) => {
      const file = await compressImage(raw)
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('products').upload(path, file)
      if (uploadError) throw uploadError
      return supabase.storage.from('products').getPublicUrl(path).data.publicUrl
    }

    let photo_url = null
    let photo_urls = []
    try {
      if (photoFile) photo_url = await uploadOne(photoFile)
      if (extraPhotos.length) {
        const extraUrls = await Promise.all(extraPhotos.map(p => uploadOne(p.file)))
        photo_urls = extraUrls
      }
      if (photo_url) photo_urls = [photo_url, ...photo_urls]
    } catch (uploadError) {
      toast('Erreur upload photo : ' + uploadError.message)
      setLoading(false)
      return
    }

    const { error } = await supabase.from('products').insert({
      user_id: user.id,
      name: form.name,
      category: form.category,
      condition: form.condition,
      purchase_price: parseFloat(form.purchase_price),
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_fees: parseFloat(form.purchase_fees) || 0,
      status: isOrder ? 'commande' : 'stock',
      expected_delivery_date: isOrder && expectedDelivery ? expectedDelivery : null,
      description: description || null,
      photo_url,
      photo_urls,
      estimated_price_min: aiEstimate?.estimated_price_min ?? null,
      estimated_price_max: aiEstimate?.estimated_price_max ?? null,
      is_luxury: aiEstimate?.is_luxury ?? false,
    })
    if (error) {
      toast('Erreur : ' + error.message)
    } else {
      toast(isOrder ? 'Commande enregistrée' : 'Produit ajouté', 'success')
      router.push(isOrder ? '/commandes' : '/products')
    }
    setLoading(false)
  }

  const categories = ['Vêtements', 'Chaussures', 'Électronique', 'Jeux vidéo', 'Maison', 'Sport', 'Autre']
  const conditions = ['Neuf avec étiquette', 'Très bon état', 'Bon état', 'État correct']

  const totalCost = (parseFloat(form.purchase_price || 0) + parseFloat(form.purchase_fees || 0)).toFixed(2)

  const inputClass = "w-full bg-surface border border-line rounded-xl px-4 py-3 text-ink placeholder-faint focus:outline-none focus:border-accent transition text-sm"
  const labelClass = "text-xs font-semibold text-muted uppercase tracking-wider"

  return (
    <div className="min-h-screen bg-canvas text-ink">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur border-b border-line px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-8 h-8 rounded-lg hover:bg-canvas flex items-center justify-center text-muted transition text-sm flex-shrink-0"
          >
            ←
          </button>
          <span className="hidden sm:inline text-sm text-muted">Dashboard</span>
          <span className="hidden sm:inline text-sm text-line2">/</span>
          <span className="text-sm font-medium text-ink2 truncate">Nouveau produit</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="hover:opacity-70 transition">
          <Logo markClass="w-6 h-6" textClass="text-lg" />
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-serif italic text-ink">Ajouter un produit</h2>
          <p className="text-muted text-sm mt-1">Renseigne les informations pour suivre ta marge automatiquement</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-6 md:p-8 flex flex-col gap-6">

          {/* Photo + estimation IA */}
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Photo (estimation IA)</span>
            <label className="flex items-center gap-4 cursor-pointer bg-canvas border border-dashed border-line2 rounded-xl px-4 py-3 hover:border-accent/50 transition">
              {photoPreview ? (
                <img loading="lazy" decoding="async" src={photoPreview} alt="" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-surface flex items-center justify-center">
                  <CameraIcon className="w-6 h-6 text-faint" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink2">{photoPreview ? 'Changer la photo' : 'Ajouter une photo'}</p>
                <p className="text-xs text-faint">Ajoute aussi des photos supplémentaires (étiquette, détails) puis lance l'analyse IA</p>
              </div>
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>

            {photoFile && !estimating && !aiEstimate && (
              <button
                type="button"
                onClick={handleEstimate}
                className="flex items-center justify-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent font-semibold rounded-xl px-4 py-2.5 mt-1 transition text-sm"
              >
                <SparkleIcon className="w-4 h-4" />
                Analyser avec l'IA{extraPhotos.length > 0 ? ` (${extraPhotos.length + 1} photos)` : ''}
              </button>
            )}

            {estimating && (
              <div className="rounded-xl px-4 py-3 mt-1 border border-violetbdr bg-gradient-to-br from-estim1 via-estim2 to-estim3">
                <div className="flex items-center gap-2 text-xs text-accent mb-3">
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
              <p className="text-xs text-coral mt-1">{estimateError}</p>
            )}
            {aiEstimate && !estimating && (
              <div className="animate-rise-in rounded-xl px-4 py-3 mt-1 border border-violetbdr bg-gradient-to-br from-estim1 via-estim2 to-estim3">
                <div className="flex items-center gap-1.5 text-xs text-accent font-semibold uppercase tracking-wider">
                  <SparkleIcon className="w-3.5 h-3.5" />
                  Valeur de revente estimée
                </div>
                <p className="text-lg font-serif text-sage mt-1">
                  {aiEstimate.estimated_price_min}€ – {aiEstimate.estimated_price_max}€
                </p>
                <p className="text-xs text-muted2 mt-2">{aiEstimate.description}</p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[
                    { label: 'eBay (vendus)', url: `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(form.name || aiEstimate.name || '')}&LH_Sold=1&LH_Complete=1` },
                    { label: 'Vinted', url: `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(form.name || aiEstimate.name || '')}` },
                    { label: 'Leboncoin', url: `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(form.name || aiEstimate.name || '')}` },
                    ...(aiEstimate.is_luxury
                      ? [{ label: 'Vestiaire Collective', url: `https://fr.vestiairecollective.com/search/?q=${encodeURIComponent(form.name || aiEstimate.name || '')}` }]
                      : []),
                    ...(form.category === 'Jeux vidéo' || form.category === 'Électronique'
                      ? [{ label: 'Rakuten', url: `https://fr.shopping.rakuten.com/search/${encodeURIComponent(form.name || aiEstimate.name || '')}` }]
                      : []),
                  ].map(l => (
                    <a
                      key={l.label}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] bg-surface hover:bg-canvas text-muted2 font-medium px-2.5 py-1 rounded-full transition border border-line"
                    >
                      Vérifier sur {l.label} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Assistant IA conversationnel */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <SparkleIcon className="w-3.5 h-3.5 text-accent" />
              <span className={labelClass}>Assistant Flip (optionnel)</span>
            </div>
            <p className="text-xs text-faint -mt-0.5">
              Décris l'article en quelques mots, ex : « Pokémon Version Rouge complet en boîte » — Flip complète nom, catégorie, état et prix pour toi.
            </p>

            {assistMessages.length > 0 && (
              <div className="flex flex-col gap-2 bg-canvas rounded-xl p-3 max-h-56 overflow-y-auto">
                {assistMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-xs whitespace-pre-line ${
                      m.role === 'user'
                        ? 'self-end bg-accent text-white rounded-br-sm'
                        : 'self-start bg-surface text-ink rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {assistSending && (
                  <div className="self-start bg-surface px-3 py-2 rounded-xl rounded-bl-sm flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-faint animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-faint animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-faint animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                value={assistInput}
                onChange={(e) => setAssistInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAssistSend() } }}
                placeholder='Ex : "Pokémon Rouge complet, cartouche + boîte"'
                className={inputClass}
              />
              <button
                type="button"
                onClick={handleAssistSend}
                disabled={assistSending || !assistInput.trim()}
                className="w-11 h-11 flex-shrink-0 bg-inkd disabled:bg-line rounded-xl flex items-center justify-center text-white transition"
              >
                →
              </button>
            </div>
          </div>

          {/* Photos supplémentaires */}
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Photos supplémentaires ({extraPhotos.length})</span>
            <div className="flex flex-wrap gap-2">
              {extraPhotos.map((p, i) => (
                <div key={i} className="relative w-16 h-16">
                  <img loading="lazy" decoding="async" src={p.preview} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <button
                    onClick={() => removeExtraPhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-inkd text-white text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 flex-shrink-0 rounded-lg bg-canvas border border-dashed border-line2 hover:border-accent/50 flex items-center justify-center cursor-pointer transition">
                <span className="text-xl text-faint">+</span>
                <input type="file" accept="image/*" multiple onChange={handleExtraPhotos} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-faint">Améliore la précision de l'analyse IA et sert pour les annonces multi-angles (Vinted, Vestiaire Collective...)</p>
          </div>

          {/* Scanner code-barres */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-3 cursor-pointer bg-canvas border border-dashed border-line2 rounded-xl px-4 py-3 hover:border-accent/50 transition">
              <BarcodeIcon className="w-5 h-5 text-faint flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink2">Scanner un code-barres</p>
                <p className="text-xs text-faint">Utile pour les objets encore emballés/scellés</p>
              </div>
              {scanning && (
                <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
              <input type="file" accept="image/*" capture="environment" onChange={handleScan} className="hidden" />
            </label>
            {scanError && (
              <p className="text-xs text-coral mt-1">{scanError}</p>
            )}
          </div>

          <div className="border-t border-line" />

          {/* Nom */}
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Nom du produit</span>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ex: Nike Air Max 90 blanche T42"
              className={inputClass}
            />
          </label>

          {/* Categorie + Etat */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Catégorie</span>
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
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>État</span>
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
            </label>
          </div>

          {/* Separateur */}
          <div className="border-t border-line" />

          {/* Prix + Frais */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Prix d'achat</span>
              <div className="relative">
                <input
                  name="purchase_price"
                  value={form.purchase_price}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-faint text-sm">€</span>
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Frais d'achat</span>
              <div className="relative">
                <input
                  name="purchase_fees"
                  value={form.purchase_fees}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-faint text-sm">€</span>
              </div>
            </label>
          </div>

          {/* Apercu cout total */}
          {form.purchase_price && (
            <div className="bg-sage/10 border border-sage/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-sage font-semibold uppercase tracking-wider">Coût total</p>
                <p className="text-xs text-sage/70 mt-0.5">Prix achat + frais</p>
              </div>
              <span className="text-xl font-serif text-sage">{totalCost} €</span>
            </div>
          )}

          {/* Separateur */}
          <div className="border-t border-line" />

          {/* En commande (pas encore reçu) */}
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setIsOrder(v => !v)}
                className={`relative w-10 h-6 rounded-full transition flex-shrink-0 ${isOrder ? 'bg-accent' : 'bg-line'}`}
                aria-pressed={isOrder}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-all ${isOrder ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <div>
                <p className="text-sm font-medium text-ink">Article encore en commande</p>
                <p className="text-xs text-muted">Payé mais pas encore reçu — il ira dans « Commandes », pas dans le stock.</p>
              </div>
            </label>

            {isOrder && (
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Livraison estimée (optionnel)</span>
                <input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className={inputClass}
                />
              </label>
            )}
          </div>

          {/* Bouton */}
          <button
            onClick={handleSubmit}
            disabled={loading || !form.name || !form.purchase_price}
            className="w-full bg-inkd hover:bg-inkdh active:scale-[0.98] disabled:bg-line disabled:text-disabled text-white font-semibold rounded-xl px-4 py-3.5 transition text-sm mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                Enregistrement...
              </span>
            ) : (
              isOrder ? 'Enregistrer la commande →' : 'Ajouter le produit →'
            )}
          </button>

        </div>
      </main>
    </div>
  )
}
