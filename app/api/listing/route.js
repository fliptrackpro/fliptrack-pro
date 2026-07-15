import { requireUser } from '@/lib/apiAuth'

function isOwnStoragePhoto(url) {
  try {
    const u = new URL(url)
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
    return u.protocol === 'https:' && u.hostname === base.hostname && u.pathname.startsWith('/storage/v1/object/public/products/')
  } catch {
    return false
  }
}

export async function POST(req) {
  const user = await requireUser(req)
  if (!user) {
    return Response.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Clé API Gemini manquante côté serveur.' }, { status: 500 })
  }

  const { name, category, condition, price, description, photo_url } = await req.json()
  if (!name || !price) {
    return Response.json({ error: 'Nom et prix requis.' }, { status: 400 })
  }

  const parts = []

  let imagePart = null
  if (photo_url && isOwnStoragePhoto(photo_url)) {
    try {
      const imgRes = await fetch(photo_url)
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
        imagePart = { inline_data: { mime_type: mimeType, data: base64 } }
      }
    } catch {
      // pas de photo exploitable, on continue sans
    }
  }

  const prompt = `Tu es un vendeur particulier français qui revend un article d'occasion. Voici les infos :
- Nom : ${name}
- Catégorie : ${category || 'non précisée'}
- État : ${condition || 'non précisé'}
- Prix de vente : ${price}€
- Notes : ${description || 'aucune'}
${imagePart ? "\nUne photo de l'article est fournie : regarde-la attentivement et intègre dans les descriptifs des détails concrets et vérifiables que tu observes sur la photo (couleur exacte, matière, détails de design, état visible, usure éventuelle, accessoires visibles). Ne décris pas quelque chose qui n'est pas visible sur la photo." : ''}

Rédige une annonce vendeuse et percutante adaptée à chacune de ces 5 plateformes, avec leurs codes propres. AUCUN emoji ou émoticône dans aucun texte, nulle part.
- Vinted : ton décontracté, direct, courte (2-4 phrases), orientée mode/objets d'occasion entre particuliers, met en avant le point fort de l'article.
- Leboncoin : ton neutre et informatif, structuré, précise l'état et les modalités (main propre / envoi), argumente la valeur du prix.
- Facebook Marketplace : ton chaleureux et local, invite au message privé, peut mentionner la remise en main propre, met en avant l'urgence ou la rareté si pertinent.
- eBay : ton précis et factuel, orienté international, détaille les caractéristiques techniques/état avec rigueur (comme une fiche produit), rassure sur l'expédition.
- Vestiaire Collective : ton haut de gamme et soigné, orienté mode/luxe d'occasion, met en avant l'authenticité, la marque, le matériau et la rareté de la pièce.

Chaque descriptif doit donner envie d'acheter : mets en avant l'état, la qualité, un détail concret qui rassure l'acheteur. Reste crédible, pas de superlatifs exagérés ni de fausses promesses.

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte autour) au format exact :
{
  "vinted": { "title": "...", "description": "..." },
  "leboncoin": { "title": "...", "description": "..." },
  "facebook": { "title": "...", "description": "..." },
  "ebay": { "title": "...", "description": "..." },
  "vestiaire": { "title": "...", "description": "..." }
}
Les titres font 80 caractères maximum.`

  parts.push({ text: prompt })
  if (imagePart) parts.push(imagePart)

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return Response.json({ error: `Erreur Gemini : ${errText}` }, { status: 502 })
    }

    const data = await geminiRes.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return Response.json({ error: 'Réponse Gemini vide ou inattendue.' }, { status: 502 })
    }

    const parsed = JSON.parse(text)
    return Response.json(parsed)
  } catch (err) {
    return Response.json({ error: 'Erreur lors de la génération : ' + err.message }, { status: 500 })
  }
}
