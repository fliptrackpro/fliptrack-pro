import { requireUser, checkAiQuota } from '@/lib/apiAuth'

const CATEGORIES = ['Vêtements', 'Chaussures', 'Électronique', 'Jeux vidéo', 'Maison', 'Sport', 'Autre']
const CONDITIONS = ['Neuf avec étiquette', 'Très bon état', 'Bon état', 'État correct']
const MAX_IMAGES = 5

export async function POST(req) {
  const user = await requireUser(req)
  if (!user) {
    return Response.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const quotaError = await checkAiQuota(req)
  if (quotaError) return quotaError

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Clé API Gemini manquante côté serveur.' }, { status: 500 })
  }

  const body = await req.json()
  // Compatible avec l'ancien format { image, mimeType } et le nouveau { images: [{data, mimeType}] }
  const images = Array.isArray(body.images) && body.images.length
    ? body.images.slice(0, MAX_IMAGES)
    : body.image
      ? [{ data: body.image, mimeType: body.mimeType }]
      : []

  if (!images.length) {
    return Response.json({ error: 'Aucune image reçue.' }, { status: 400 })
  }

  const multiPhotoNote = images.length > 1
    ? `\nPlusieurs photos du même article sont fournies (angles différents, étiquette, détails). Croise les informations entre toutes les photos avant de répondre : ne te limite pas à la première.`
    : ''

  const prompt = `Tu es un expert en revente d'articles d'occasion (Vinted, Leboncoin, Facebook Marketplace) en France.
Analyse la ou les photo(s) du produit et réponds UNIQUEMENT avec un objet JSON valide (pas de texte autour, pas de markdown) avec exactement ces champs :
{
  "name": "nom court et précis du produit (marque + modèle si identifiable). Si la marque/le modèle exact n'est pas clairement lisible sur la photo, utilise une description générique honnête plutôt que d'inventer une marque ou un modèle précis.",
  "category": "une valeur EXACTE parmi ${JSON.stringify(CATEGORIES)}",
  "condition": "une valeur EXACTE parmi ${JSON.stringify(CONDITIONS)}",
  "estimated_price_min": nombre (prix de revente bas, en euros),
  "estimated_price_max": nombre (prix de revente haut, en euros),
  "description": "descriptif de 2-3 phrases prêt à publier sur une petite annonce, en français, ton vendeur particulier",
  "is_luxury": true ou false (true UNIQUEMENT si tu identifies une marque de luxe/designer reconnue : Chanel, Louis Vuitton, Hermès, Gucci, Dior, Prada, Rolex, Cartier, Balenciaga, Saint Laurent, etc. false pour toute marque grand public comme Nike, Zara, H&M, Uniqlo, même en très bon état)
}
Base ton estimation de prix sur le marché français de la seconde main actuel. Si tu es incertain sur l'identification exacte de l'article ou son état, élargis la fourchette de prix plutôt que de donner une fourchette étroite mais possiblement fausse.${multiPhotoNote}`

  const parts = [{ text: prompt }]
  for (const img of images) {
    if (img?.data) {
      parts.push({ inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.data } })
    }
  }

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
    return Response.json({ error: 'Erreur lors de l\'estimation : ' + err.message }, { status: 500 })
  }
}
