'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { friendlyError } from '@/lib/errors'
import Logo from '@/components/Logo'
import SaleCelebration from '@/components/SaleCelebration'

export default function SellProduct() {
  const router = useRouter()
  const params = useParams()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(false)
  const [celebration, setCelebration] = useState(null)
  const [toShip, setToShip] = useState(false)
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

  // Taux de frais vendeur indicatifs par plateforme (Vinted/LBC/Facebook : payés par l'acheteur ou gratuits)
  const FEE_RATES = {
    'Vinted': 0,
    'Leboncoin': 0,
    'Facebook Marketplace': 0,
    'eBay': 0.11,
    'Vestiaire Collective': 0.18,
  }

  const suggestedFees = (platform, salePrice) => {
    const rate = FEE_RATES[platform]
    const price = parseFloat(salePrice)
    if (rate == null || !price) return null
    return (price * rate).toFixed(2)
  }

  const handleChange = (e) => {
    const next = { ...form, [e.target.name]: e.target.value }
    if (e.target.name === 'platform' || e.target.name === 'sale_price') {
      const fees = suggestedFees(
        e.target.name === 'platform' ? e.target.value : next.platform,
        e.target.name === 'sale_price' ? e.target.value : next.sale_price
      )
      if (fees != null) next.platform_fees = fees
    }
    setForm(next)
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
      shipping_status: toShip ? 'to_ship' : 'completed',
    })

    if (saleError) {
      toast(friendlyError(saleError))
      setLoading(false)
      return
    }

    const { error: productError } = await supabase
      .from('products')
      .update({ status: 'vendu' })
      .eq('id', product.id)
      .eq('user_id', user.id)

    if (productError) {
      toast(friendlyError(productError))
      setLoading(false)
      return
    }

    setLoading(false)
    setCelebration({
      productName: product.name,
      platform: form.platform,
      margin: parseFloat(form.sale_price) - product.purchase_price - product.purchase_fees - (parseFloat(form.platform_fees) || 0),
    })
  }

  const platforms = ['Vinted', 'Leboncoin', 'eBay', 'Facebook Marketplace', 'Vestiaire Collective', 'Autre']

  const margin = product
    ? (parseFloat(form.sale_price || 0) - product.purchase_price - product.purchase_fees - parseFloat(form.platform_fees || 0)).toFixed(2)
    : 0

  const inputClass = "w-full bg-surface border border-line rounded-xl px-4 py-3 text-ink placeholder-faint focus:outline-none focus:border-accent transition text-sm"
  const labelClass = "text-xs font-semibold text-muted uppercase tracking-wider"

  if (!product) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas text-ink">

      {celebration && (
        <SaleCelebration
          productName={celebration.productName}
          platform={celebration.platform}
          margin={celebration.margin}
          onViewSales={() => router.push('/sales')}
          onBackToStock={() => router.push('/products')}
        />
      )}

      <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur border-b border-line px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/products')}
            className="w-8 h-8 rounded-lg hover:bg-canvas flex items-center justify-center text-muted transition text-sm flex-shrink-0"
          >
            ←
          </button>
          <span className="hidden sm:inline text-sm text-muted">Stock</span>
          <span className="hidden sm:inline text-sm text-line2">/</span>
          <span className="text-sm font-medium text-ink2 truncate">Vendre</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="hover:opacity-70 transition">
          <Logo markClass="w-6 h-6" textClass="text-lg" />
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h2 className="text-2xl font-serif italic text-ink">Vendre « {product.name} »</h2>
          <p className="text-muted text-sm mt-1">Coût d'achat : {(product.purchase_price + product.purchase_fees).toFixed(2)}€</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-6 md:p-8 flex flex-col gap-6">

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Plateforme</span>
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
          </label>

          <div className="border-t border-line" />

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Prix de vente</span>
              <div className="relative">
                <input
                  name="sale_price"
                  value={form.sale_price}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-faint text-sm">€</span>
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Frais plateforme</span>
              <div className="relative">
                <input
                  name="platform_fees"
                  value={form.platform_fees}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-faint text-sm">€</span>
              </div>
              {form.platform && FEE_RATES[form.platform] != null && (
                <p className="text-[11px] text-muted">
                  {FEE_RATES[form.platform] === 0
                    ? `Pas de frais vendeur sur ${form.platform}, ajuste si besoin.`
                    : `Estimé à ${(FEE_RATES[form.platform] * 100).toFixed(0)}% sur ${form.platform}, ajuste si besoin.`}
                </p>
              )}
            </label>
          </div>

          {form.sale_price && (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
              margin >= 0 ? 'bg-sage/10 border-sage/20' : 'bg-coral/10 border-coral/20'
            }`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${margin >= 0 ? 'text-sage' : 'text-coral'}`}>Marge nette</p>
                <p className={`text-xs mt-0.5 ${margin >= 0 ? 'text-sage/70' : 'text-coral/70'}`}>Vente − coût d'achat − frais</p>
              </div>
              <span className={`text-xl font-serif ${margin >= 0 ? 'text-sage' : 'text-coral'}`}>{margin}€</span>
            </div>
          )}

          {/* À expédier */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={() => setToShip(v => !v)}
              className={`relative w-10 h-6 rounded-full transition flex-shrink-0 ${toShip ? 'bg-accent' : 'bg-line'}`}
              aria-pressed={toShip}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-surface shadow transition-all ${toShip ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            <div>
              <p className="text-sm font-medium text-ink">Article à expédier</p>
              <p className="text-xs text-muted">Suis l'envoi dans « Commandes » jusqu'à la réception par l'acheteur.</p>
            </div>
          </label>

          <button
            onClick={handleSubmit}
            disabled={loading || !form.sale_price}
            className="w-full bg-inkd hover:bg-inkdh active:scale-[0.98] disabled:bg-line disabled:text-disabled text-white font-semibold rounded-xl px-4 py-3.5 transition text-sm mt-1"
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
