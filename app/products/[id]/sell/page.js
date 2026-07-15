'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function SellProduct() {
  const router = useRouter()
  const params = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    sale_price: '',
    platform_fees: '',
    platform: '',
  })

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: saleError } = await supabase.from('sales').insert({
      product_id: product.id,
      user_id: user.id,
      sale_price: parseFloat(form.sale_price),
      platform_fees: parseFloat(form.platform_fees) || 0,
      platform: form.platform,
      sale_date: new Date().toISOString().split('T')[0],
    })

    if (saleError) {
      alert('Erreur : ' + saleError.message)
      setLoading(false)
      return
    }

    const { error: productError } = await supabase
      .from('products')
      .update({ status: 'vendu' })
      .eq('id', product.id)

    if (productError) {
      alert('Erreur : ' + productError.message)
      setLoading(false)
      return
    }

    router.push('/sales')
  }

  const platforms = ['Vinted', 'Leboncoin', 'eBay', 'Vestiaire Collective', 'Autre']

  const margin = product
    ? (parseFloat(form.sale_price || 0) - product.purchase_price - product.purchase_fees - parseFloat(form.platform_fees || 0)).toFixed(2)
    : 0

  if (!product) return (
    <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-gray-900">

      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/products')}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition text-sm"
          >
            ←
          </button>
          <span className="text-sm text-gray-400">Stock</span>
          <span className="text-sm text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700">Vendre</span>
        </div>
        <span className="text-lg font-bold text-gray-900">
          Flip<span className="text-emerald-500">Track</span>
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Vendre « {product.name} »</h2>
          <p className="text-gray-400 text-sm mt-1">Coût d'achat : {(product.purchase_price + product.purchase_fees).toFixed(2)}€</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 flex flex-col gap-6">

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plateforme</label>
            <select
              name="platform"
              value={form.platform}
              onChange={handleChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:border-emerald-400 focus:bg-white transition text-sm"
            >
              <option value="">Choisir</option>
              {platforms.map(pl => (
                <option key={pl} value={pl}>{pl}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-gray-100" />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Prix de vente</label>
              <div className="relative">
                <input
                  name="sale_price"
                  value={form.sale_price}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-8 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:bg-white transition text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Frais plateforme</label>
              <div className="relative">
                <input
                  name="platform_fees"
                  value={form.platform_fees}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-8 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:bg-white transition text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              </div>
            </div>
          </div>

          {form.sale_price && (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
              margin >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
            }`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Marge nette</p>
                <p className={`text-xs mt-0.5 ${margin >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Vente − coût d'achat − frais</p>
              </div>
              <span className={`text-xl font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{margin}€</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !form.sale_price}
            className="w-full bg-gray-900 hover:bg-gray-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-semibold rounded-xl px-4 py-3.5 transition text-sm mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></span>
                Enregistrement...
              </span>
            ) : (
              'Confirmer la vente →'
            )}
          </button>

        </div>
      </main>
    </div>
  )
}
