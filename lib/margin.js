export function saleMargin(product, sale) {
  if (!product || !sale) return 0
  return (sale.sale_price || 0) - (product.purchase_price || 0) - (product.purchase_fees || 0) - (sale.platform_fees || 0)
}
