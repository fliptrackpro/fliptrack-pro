export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Clé API Gemini manquante côté serveur.' }, { status: 500 })
  }

  const { name, category, condition, price, description } = await req.json()
  if (!name || !price) {
    return Response.json({ error: 'Nom et prix requis.' }, { status: 400 })
  }

  const prompt = `Tu es un vendeur particulier français qui revend un article d'occasion. Voici les infos :
- Nom : ${name}
- Catégorie : ${category || 'non précisée'}
- État : ${condition || 'non précisé'}
- Prix de vente : ${price}€
- Notes : ${description || 'aucune'}

Rédige une annonce adaptée à chacune de ces 3 plateformes, avec leurs codes propres :
- Vinted : ton décontracté, direct, quelques emojis, courte (2-4 phrases), orientée mode/objets d'occasion entre particuliers.
- Leboncoin : ton neutre et informatif, structuré, précise l'état et les modalités (main propre / envoi), pas d'emoji.
- Facebook Marketplace : ton chaleureux et local, invite au message privé, peut mentionner la remise en main propre, 1-2 emojis max.

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de texte autour) au format exact :
{
  "vinted": { "title": "...", "description": "..." },
  "leboncoin": { "title": "...", "description": "..." },
  "facebook": { "title": "...", "description": "..." }
}
Les titres font 80 caractères maximum.`

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
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
