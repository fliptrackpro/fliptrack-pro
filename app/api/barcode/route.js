export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (!code) {
    return Response.json({ error: 'Code-barres manquant.' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`)
    if (!res.ok) {
      return Response.json({ error: 'Service de recherche indisponible.' }, { status: 502 })
    }
    const data = await res.json()
    const item = data?.items?.[0]
    if (!item) {
      return Response.json({ error: 'Produit non reconnu pour ce code-barres.' }, { status: 404 })
    }

    return Response.json({
      name: item.title || '',
      brand: item.brand || '',
      category: item.category || '',
    })
  } catch (err) {
    return Response.json({ error: 'Erreur lors de la recherche : ' + err.message }, { status: 500 })
  }
}
