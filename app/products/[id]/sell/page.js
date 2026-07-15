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

  const inputClass = "w-full bg-white border border-[#eae5f0] rounded-xl px-4 py-3 text-[#241f2e] placeholder-[#b3aebf] focus:outline-none focus:border-[#6d5ce6] transition text-sm"
  const labelClass = "text-xs font-semibold text-[#8b8496] uppercase tracking-wider"

  if (!product) return (
    <div className="min-h-screen bg-[#f5f2ec] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#6d5ce6] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f2ec] text-[#241f2e]">

      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#eae5f0] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/products')}
            className="w-8 h-8 rounded-lg hover:bg-[#f5f2ec] flex items-center justify-center text-[#8b8496] transition text-sm"
          >
            ←
          </button>
          <span className="text-sm text-[#8b8496]">Stock</span>
          <span className="text-sm text-[#d6cfe8]">/</span>
          <span className="text-sm font-medium text-[#4a4356]">Vendre</span>
        </div>
        <span className="text-lg font-serif italic text-[#241f2e]">
          Flip<span className="not-italic font-sans font-bold text-[#6d5ce6]">Track</span>
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-serif italic text-[#241f2e]">Vendre « {product.name} »</h2>
          <p className="text-[#8b8496] text-sm mt-1">Coût d'achat : {(product.purchase_price + product.purchase_fees).toFixed(2)}€</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-6 md:p-8 flex flex-col gap-6">

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

          <div className="border-t border-[#eae5f0]" />

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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3aebf] text-sm">€</span>
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b3aebf] text-sm">€</span>
              </div>
            </div>
          </div>

          {form.sale_price && (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
              margin >= 0 ? 'bg-[#4a8a6f]/10 border-[#4a8a6f]/20' : 'bg-[#e0654a]/10 border-[#e0654a]/20'
            }`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${margin >= 0 ? 'text-[#4a8a6f]' : 'text-[#e0654a]'}`}>Marge nette</p>
                <p className={`text-xs mt-0.5 ${margin >= 0 ? 'text-[#4a8a6f]/70' : 'text-[#e0654a]/70'}`}>Vente − coût d'achat − frais</p>
              </div>
              <span className={`text-xl font-serif ${margin >= 0 ? 'text-[#4a8a6f]' : 'text-[#e0654a]'}`}>{margin}€</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !form.sale_price}
            className="w-full bg-[#241f2e] hover:bg-[#3a3347] active:scale-[0.98] disabled:bg-[#eae5f0] disabled:text-[#c3bcf0] text-white font-semibold rounded-xl px-4 py-3.5 transition text-sm mt-1"
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
