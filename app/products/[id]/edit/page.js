'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/components/Toast'

export default function EditProduct() {
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [form, setForm] = useState(null)

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
      setForm({
        name: data.name || '',
        category: data.category || '',
        condition: data.condition || '',
        purchase_price: data.purchase_price ?? '',
        purchase_fees: data.purchase_fees ?? '',
        photo_url: data.photo_url || null,
      })
      setPhotoPreview(data.photo_url || null)
    }
    load()
  }, [params.id, router])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return router.push('/login')
    }

    let photo_url = form.photo_url
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

    const { error } = await supabase.from('products').update({
      name: form.name,
      category: form.category,
      condition: form.condition,
      purchase_price: parseFloat(form.purchase_price),
      purchase_fees: parseFloat(form.purchase_fees) || 0,
      photo_url,
    }).eq('id', params.id).eq('user_id', user.id)

    if (error) {
      toast('Erreur : ' + error.message)
    } else {
      toast('Produit modifié', 'success')
      router.push('/products')
    }
    setLoading(false)
  }

  const categories = ['Vêtements', 'Chaussures', 'Électronique', 'Jeux vidéo', 'Maison', 'Sport', 'Autre']
  const conditions = ['Neuf avec étiquette', 'Très bon état', 'Bon état', 'État correct']

  const inputClass = "w-full bg-[#0d0f14] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-400 transition text-sm"
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wider"

  if (!form) return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalCost = (parseFloat(form.purchase_price || 0) + parseFloat(form.purchase_fees || 0)).toFixed(2)

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
          <span className="text-sm font-medium text-gray-300">Modifier</span>
        </div>
        <span className="text-lg font-bold text-white">
          Flip<span className="text-emerald-400">Track</span>
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Modifier le produit</h2>
        </div>

        <div className="bg-[#161920] rounded-2xl border border-white/5 p-6 md:p-8 flex flex-col gap-6">

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Photo</label>
            <label className="flex items-center gap-4 cursor-pointer bg-[#0d0f14] border border-dashed border-white/15 rounded-xl px-4 py-3 hover:border-emerald-400/50 transition">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center text-xl">📷</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300">{photoPreview ? 'Changer la photo' : 'Ajouter une photo'}</p>
              </div>
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>

          <div className="border-t border-white/5" />

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nom du produit</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

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

          <div className="border-t border-white/5" />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Prix d'achat</label>
              <div className="relative">
                <input
                  name="purchase_price"
                  value={form.purchase_price}
                  onChange={handleChange}
                  type="number"
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
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
              </div>
            </div>
          </div>

          {form.purchase_price && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Coût total</p>
                <p className="text-xs text-emerald-500/70 mt-0.5">Prix achat + frais</p>
              </div>
              <span className="text-xl font-bold text-emerald-400">{totalCost} €</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !form.name || !form.purchase_price}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-gray-600 text-white font-semibold rounded-xl px-4 py-3.5 transition text-sm mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                Enregistrement...
              </span>
            ) : (
              'Enregistrer les modifications →'
            )}
          </button>

        </div>
      </main>
    </div>
  )
}
