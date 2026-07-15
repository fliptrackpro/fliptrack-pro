const CATEGORIES = ['Vêtements', 'Chaussures', 'Électronique', 'Jeux vidéo', 'Maison', 'Sport', 'Autre']
const CONDITIONS = ['Neuf avec étiquette', 'Très bon état', 'Bon état', 'État correct']

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Clé API Gemini manquante côté serveur.' }, { status: 500 })
  }

  const { image, mimeType } = await req.json()
  if (!image) {
    return Response.json({ error: 'Aucune image reçue.' }, { status: 400 })
  }

  const prompt = `Tu es un expert en revente d'articles d'occasion (Vinted, Leboncoin, Facebook Marketplace) en France.
Analyse la photo du produit et réponds UNIQUEMENT avec un objet JSON valide (pas de texte autour, pas de markdown) avec exactement ces champs :
{
  "name": "nom court et précis du produit (marque + modèle si identifiable)",
  "category": "une valeur EXACTE parmi ${JSON.stringify(CATEGORIES)}",
  "condition": "une valeur EXACTE parmi ${JSON.stringify(CONDITIONS)}",
  "estimated_price_min": nombre (prix de revente bas, en euros),
  "estimated_price_max": nombre (prix de revente haut, en euros),
  "description": "descriptif de 2-3 phrases prêt à publier sur une petite annonce, en français, ton vendeur particulier"
}
Base ton estimation de prix sur le marché français de la seconde main actuel.`

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: image } },
            ],
          }],
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
