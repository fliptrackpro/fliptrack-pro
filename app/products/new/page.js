'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { CameraIcon } from '@/components/icons'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
        headers: { 'Content-Type': 'application/json' },
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

  const inputClass = "w-full bg-[#0d0f14] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-400 transition text-sm"
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wider"

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#111318] border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 transition text-sm"
          >
            ←
          </button>
          <span className="text-sm text-gray-500">Dashboard</span>
          <span className="text-sm text-gray-700">/</span>
          <span className="text-sm font-medium text-gray-300">Nouveau produit</span>
        </div>
        <span className="text-lg font-bold text-white">
          Flip<span className="text-emerald-400">Track</span>
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Ajouter un produit</h2>
          <p className="text-gray-500 text-sm mt-1">Renseigne les informations pour suivre ta marge automatiquement</p>
        </div>

        <div className="bg-[#161920] rounded-2xl border border-white/5 p-6 md:p-8 flex flex-col gap-6">

          {/* Photo + estimation IA */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Photo (estimation IA)</label>
            <label className="flex items-center gap-4 cursor-pointer bg-[#0d0f14] border border-dashed border-white/15 rounded-xl px-4 py-3 hover:border-emerald-400/50 transition">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center">
                  <CameraIcon className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300">{photoPreview ? 'Changer la photo' : 'Ajouter une photo'}</p>
                <p className="text-xs text-gray-600">L'IA remplit le nom, la catégorie et l'état pour toi</p>
              </div>
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>

            {estimating && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 mt-1">
                <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                Analyse de la photo en cours...
              </div>
            )}
            {estimateError && (
              <p className="text-xs text-red-400 mt-1">{estimateError}</p>
            )}
            {aiEstimate && !estimating && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mt-1">
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Valeur de revente estimée</p>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">
                  {aiEstimate.estimated_price_min}€ – {aiEstimate.estimated_price_max}€
                </p>
                <p className="text-xs text-gray-400 mt-2">{aiEstimate.description}</p>
              </div>
            )}
          </div>

          <div className="border-t border-white/5" />

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
          <div className="border-t border-white/5" />

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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
              </div>
            </div>
          </div>

          {/* Apercu cout total */}
          {form.purchase_price && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Coût total</p>
                <p className="text-xs text-emerald-500/70 mt-0.5">Prix achat + frais</p>
              </div>
              <span className="text-xl font-bold text-emerald-400">{totalCost} €</span>
            </div>
          )}

          {/* Bouton */}
          <button
            onClick={handleSubmit}
            disabled={loading || !form.name || !form.purchase_price}
            className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] disabled:bg-white/5 disabled:text-gray-600 text-white font-semibold rounded-xl px-4 py-3.5 transition text-sm mt-1"
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
