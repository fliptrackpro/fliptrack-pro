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

Rédige une annonce vendeuse et percutante adaptée à chacune de ces 3 plateformes, avec leurs codes propres. AUCUN emoji ou émoticône dans aucun texte, nulle part.
- Vinted : ton décontracté, direct, courte (2-4 phrases), orientée mode/objets d'occasion entre particuliers, met en avant le point fort de l'article.
- Leboncoin : ton neutre et informatif, structuré, précise l'état et les modalités (main propre / envoi), argumente la valeur du prix.
- Facebook Marketplace : ton chaleureux et local, invite au message privé, peut mentionner la remise en main propre, met en avant l'urgence ou la rareté si pertinent.

Chaque descriptif doit donner envie d'acheter : mets en avant l'état, la qualité, un détail concret qui rassure l'acheteur. Reste crédible, pas de superlatifs exagérés ni de fausses promesses.

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
