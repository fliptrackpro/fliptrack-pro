'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewProduct() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('products').insert({
      user_id: user.id,
      name: form.name,
      category: form.category,
      condition: form.condition,
      purchase_price: parseFloat(form.purchase_price),
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_fees: parseFloat(form.purchase_fees) || 0,
      status: 'stock'
    })
    if (error) {
      alert('Erreur : ' + error.message)
    } else {
      router.push('/products')
    }
    setLoading(false)
  }

  const categories = ['Vêtements', 'Chaussures', 'Électronique', 'Jeux vidéo', 'Maison', 'Sport', 'Autre']
  const conditions = ['Neuf avec étiquette', 'Très bon état', 'Bon état', 'État correct']

  const totalCost = (parseFloat(form.purchase_price || 0) + parseFloat(form.purchase_fees || 0)).toFixed(2)

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-gray-900">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition text-sm"
          >
            ←
          </button>
          <span className="text-sm text-gray-400">Dashboard</span>
          <span className="text-sm text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">Nouveau produit</span>
        </div>
        <span className="text-lg font-bold text-gray-900">
          Flip<span className="text-emerald-500">Track</span>
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Ajouter un produit</h2>
          <p className="text-gray-400 text-sm mt-1">Renseigne les informations pour suivre ta marge automatiquement</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 flex flex-col gap-6">

          {/* Nom */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom du produit</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ex: Nike Air Max 90 blanche T42"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:bg-white transition text-sm"
            />
          </div>

          {/* Categorie + Etat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Catégorie</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-emerald-400 focus:bg-white transition text-sm"
              >
                <option value="">Choisir</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">État</label>
              <select
                name="condition"
                value={form.condition}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-emerald-400 focus:bg-white transition text-sm"
              >
                <option value="">Choisir</option>
                {conditions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Separateur */}
          <div className="border-t border-gray-100" />

          {/* Prix + Frais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prix d'achat</label>
              <div className="relative">
                <input
                  name="purchase_price"
                  value={form.purchase_price}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-8 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:bg-white transition text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Frais d'achat</label>
              <div className="relative">
                <input
                  name="purchase_fees"
                  value={form.purchase_fees}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-8 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:bg-white transition text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              </div>
            </div>
          </div>

          {/* Apercu cout total */}
          {form.purchase_price && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Coût total</p>
                <p className="text-xs text-emerald-500 mt-0.5">Prix achat + frais</p>
              </div>
              <span className="text-xl font-bold text-emerald-600">{totalCost} €</span>
            </div>
          )}

          {/* Bouton */}
          <button
            onClick={handleSubmit}
            disabled={loading || !form.name || !form.purchase_price}
            className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-xl px-4 py-3.5 transition text-sm mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></span>
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