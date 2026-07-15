'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/components/Toast'

export default function SellProduct() {
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
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
    if (!user) {
      setLoading(false)
      return router.push('/login')
    }

    const { error: saleError } = await supabase.from('sales').insert({
      product_id: product.id,
      user_id: user.id,
      sale_price: parseFloat(form.sale_price),
      platform_fees: parseFloat(form.platform_fees) || 0,
      platform: form.platform,
      sale_date: new Date().toISOString().split('T')[0],
    })

    if (saleError) {
      toast('Erreur : ' + saleError.message)
      setLoading(false)
      return
    }

    const { error: productError } = await supabase
      .from('products')
      .update({ status: 'vendu' })
      .eq('id', product.id)

    if (productError) {
      toast('Erreur : ' + productError.message)
      setLoading(false)
      return
    }

    toast('Vente enregistrée', 'success')
    router.push('/sales')
  }

  const platforms = ['Vinted', 'Leboncoin', 'eBay', 'Facebook Marketplace', 'Vestiaire Collective', 'Autre']

  const margin = product
    ? (parseFloat(form.sale_price || 0) - product.purchase_price - product.purchase_fees - parseFloat(form.platform_fees || 0)).toFixed(2)
    : 0

  const inputClass = "w-full bg-[#0d0f14] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-400 transition text-sm"
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wider"

  if (!product) return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
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
          <span className="text-sm font-medium text-gray-300">Vendre</span>
        </div>
        <span className="text-lg font-bold text-white">
          Flip<span className="text-emerald-400">Track</span>
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Vendre « {product.name} »</h2>
          <p className="text-gray-500 text-sm mt-1">Coût d'achat : {(product.purchase_price + product.purchase_fees).toFixed(2)}€</p>
        </div>

        <div className="bg-[#161920] rounded-2xl border border-white/5 p-6 md:p-8 flex flex-col gap-6">

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Plateforme</label>
            <select
              name="platform"
              value={form.platform}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Choisir</option>
              {platforms.map(pl => (
                <option key={pl} value={pl}>{pl}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-white/5" />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Prix de vente</label>
              <div className="relative">
                <input
                  name="sale_price"
                  value={form.sale_price}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Frais plateforme</label>
              <div className="relative">
                <input
                  name="platform_fees"
                  value={form.platform_fees}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">€</span>
              </div>
            </div>
          </div>

          {form.sale_price && (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
              margin >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>Marge nette</p>
                <p className={`text-xs mt-0.5 ${margin >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>Vente − coût d'achat − frais</p>
              </div>
              <span className={`text-xl font-bold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{margin}€</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !form.sale_price}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-gray-600 text-white font-semibold rounded-xl px-4 py-3.5 transition text-sm mt-1"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
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
