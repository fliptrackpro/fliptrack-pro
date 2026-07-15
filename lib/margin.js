export function saleMargin(product, sale) {
  if (!product || !sale) return 0
  return (sale.sale_price || 0) - (product.purchase_price || 0) - (product.purchase_fees || 0) - (sale.platform_fees || 0)
}

function daysSince(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return Math.floor((now - d) / (1000 * 60 * 60 * 24))
}

export function buildContextSummary(products, sales) {
  const now = new Date()
  const monthSales = sales.filter(s => {
    const d = new Date(s.sale_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const monthRevenue = monthSales.reduce((acc, s) => acc + (s.sale_price || 0), 0)
  const monthMargin = monthSales.reduce((acc, s) => {
    const p = products.find(pp => pp.id === s.product_id)
    return acc + saleMargin(p, s)
  }, 0)

  const inStock = products.filter(p => p.status === 'stock')
  const stagnant = inStock
    .map(p => ({ ...p, days: daysSince(p.purchase_date) }))
    .filter(p => p.days >= 30)
    .sort((a, b) => b.days - a.days)
    .slice(0, 5)

  const toRepost = inStock
    .filter(p => !p.last_reposted_at || daysSince(p.last_reposted_at) >= 14)
    .slice(0, 5)

  const lines = [
    `Articles en stock : ${inStock.length}`,
    `Articles vendus au total : ${products.filter(p => p.status === 'vendu').length}`,
    `Ce mois-ci : CA ${monthRevenue.toFixed(0)}€, marge nette ${monthMargin.toFixed(0)}€ sur ${monthSales.length} vente(s)`,
  ]

  if (stagnant.length) {
    lines.push(`Articles en stock depuis longtemps (≥30 jours) : ${stagnant.map(p => `${p.name} (${p.days}j, acheté ${p.purchase_price}€)`).join(', ')}`)
  }
  if (toRepost.length) {
    lines.push(`Articles à reposter (jamais reposté ou ≥14 jours) : ${toRepost.map(p => p.name).join(', ')}`)
  }

  return lines.join('\n')
}
