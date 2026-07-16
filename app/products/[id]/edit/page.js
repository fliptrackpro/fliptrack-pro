'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/components/Toast'
import Logo from '@/components/Logo'
import { CameraIcon } from '@/components/icons'

export default function EditProduct() {
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [existingExtraUrls, setExistingExtraUrls] = useState([])
  const [newExtraPhotos, setNewExtraPhotos] = useState([])
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
      const allUrls = Array.isArray(data.photo_urls) ? data.photo_urls : []
      setExistingExtraUrls(allUrls.filter(u => u !== data.photo_url))
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

  const handleNewExtraPhotos = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setNewExtraPhotos(prev => [...prev, ...files.map(file => ({ file, preview: URL.createObjectURL(file) }))])
    e.target.value = ''
  }

  const removeExistingExtra = (url) => {
    setExistingExtraUrls(prev => prev.filter(u => u !== url))
  }

  const removeNewExtra = (index) => {
    setNewExtraPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return router.push('/login')
    }

    const uploadOne = async (file) => {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('products').upload(path, file)
      if (uploadError) throw uploadError
      return supabase.storage.from('products').getPublicUrl(path).data.publicUrl
    }

    let photo_url = form.photo_url
    let photo_urls
    try {
      if (photoFile) photo_url = await uploadOne(photoFile)
      const newExtraUrls = newExtraPhotos.length
        ? await Promise.all(newExtraPhotos.map(p => uploadOne(p.file)))
        : []
      photo_urls = [...(photo_url ? [photo_url] : []), ...existingExtraUrls, ...newExtraUrls]
    } catch (uploadError) {
      toast('Erreur upload photo : ' + uploadError.message)
      setLoading(false)
      return
    }

    const { error } = await supabase.from('products').update({
      name: form.name,
      category: form.category,
      condition: form.condition,
      purchase_price: parseFloat(form.purchase_price),
      purchase_fees: parseFloat(form.purchase_fees) || 0,
      photo_url,
      photo_urls,
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

  const inputClass = "w-full bg-white border border-[#eae5f0] rounded-xl px-4 py-3 text-[#241f2e] placeholder-[#b3aebf] focus:outline-none focus:border-[#6d5ce6] transition text-sm"
  const labelClass = "text-xs font-semibold text-[#8b8496] uppercase tracking-wider"

  if (!form) return (
    <div className="min-h-screen bg-[#f5f2ec] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#6d5ce6] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalCost = (parseFloat(form.purchase_price || 0) + parseFloat(form.purchase_fees || 0)).toFixed(2)

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
          <span className="text-sm font-medium text-[#4a4356] truncate">Modifier</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="hover:opacity-70 transition">
          <Logo markClass="w-6 h-6" textClass="text-lg" />
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-serif italic text-[#241f2e]">Modifier le produit</h2>
        </div>

        <div className="bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-6 md:p-8 flex flex-col gap-6">

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Photo</label>
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
              </div>
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Photos supplémentaires ({existingExtraUrls.length + newExtraPhotos.length})</label>
            <div className="flex flex-wrap gap-2">
              {existingExtraUrls.map((url) => (
                <div key={url} className="relative w-16 h-16">
                  <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <button
                    onClick={() => removeExistingExtra(url)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#241f2e] text-white text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {newExtraPhotos.map((p, i) => (
                <div key={i} className="relative w-16 h-16">
                  <img src={p.preview} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <button
                    onClick={() => removeNewExtra(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#241f2e] text-white text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 flex-shrink-0 rounded-lg bg-[#f5f2ec] border border-dashed border-[#d6cfe8] hover:border-[#6d5ce6]/50 flex items-center justify-center cursor-pointer transition">
                <span className="text-xl text-[#b3aebf]">+</span>
                <input type="file" accept="image/*" multiple onChange={handleNewExtraPhotos} className="hidden" />
              </label>
            </div>
          </div>

          <div className="border-t border-[#eae5f0]" />

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

          <div className="border-t border-[#eae5f0]" />

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
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3aebf] text-sm">€</span>
              </div>
            </div>
          </div>

          {form.purchase_price && (
            <div className="bg-[#4a8a6f]/10 border border-[#4a8a6f]/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#4a8a6f] font-semibold uppercase tracking-wider">Coût total</p>
                <p className="text-xs text-[#4a8a6f]/70 mt-0.5">Prix achat + frais</p>
              </div>
              <span className="text-xl font-serif text-[#4a8a6f]">{totalCost} €</span>
            </div>
          )}

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
              'Enregistrer les modifications →'
            )}
          </button>

        </div>
      </main>
    </div>
  )
}
