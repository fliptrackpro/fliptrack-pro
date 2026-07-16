import { requireUser, checkAiQuota } from '@/lib/apiAuth'

const CATEGORIES = ['Vêtements', 'Chaussures', 'Électronique', 'Jeux vidéo', 'Maison', 'Sport', 'Autre']
const CONDITIONS = ['Neuf avec étiquette', 'Très bon état', 'Bon état', 'État correct']

const SYSTEM_PROMPT = `Tu es Flip, un assistant qui aide un utilisateur à remplir une fiche produit pour la revente d'occasion (Vinted, Leboncoin, Facebook Marketplace) en France, en discutant avec lui en langage naturel.

L'utilisateur va te décrire son article (ex: "c'est un Pokémon Version Rouge complet en boîte, cartouche fonctionnelle"). Utilise ces informations, en particulier pour identifier précisément la version/édition d'un article quand c'est pertinent (jeux vidéo, objets de collection : édition, région, langue, complétude cartouche/boîte/notice).

Réponds UNIQUEMENT avec un objet JSON valide (pas de texte autour, pas de markdown) avec exactement ces champs :
{
  "reply": "une réponse courte en français (1-2 phrases), confirmant ce que tu as comprend et comblé, ton naturel et amical, sans emoji ni markdown",
  "fields": {
    "name": "nom précis incluant la version/édition si connue (omettre le champ si rien de nouveau à en dire)",
    "category": "une valeur EXACTE parmi ${JSON.stringify(CATEGORIES)} (omettre si incertain)",
    "condition": "une valeur EXACTE parmi ${JSON.stringify(CONDITIONS)} (omettre si l'utilisateur ne donne pas assez d'info sur l'état)",
    "description": "descriptif de 2-3 phrases prêt à publier en petite annonce, mentionnant la complétude si pertinent (omettre si rien de nouveau)",
    "estimated_price_min": nombre en euros (omettre si tu n'as pas assez d'info pour estimer),
    "estimated_price_max": nombre en euros (omettre si tu n'as pas assez d'info pour estimer)
  }
}
N'inclus dans "fields" QUE les champs que le dernier message de l'utilisateur te permet de déduire ou d'affiner avec confiance ; omets complètement les autres (n'envoie pas de valeur vide ou devinée au hasard). Si le message ne contient aucune information exploitable pour la fiche, renvoie "fields": {}.`

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
  const messages = Array.isArray(body.messages) ? body.messages : []
  if (!messages.length) {
    return Response.json({ error: 'Message requis.' }, { status: 400 })
  }

  const currentForm = body.currentForm || {}
  const formSummary = `État actuel du formulaire : nom="${currentForm.name || ''}", catégorie="${currentForm.category || ''}", état="${currentForm.condition || ''}".`

  const contents = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-12)
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '').slice(0, 1000) }],
    }))

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT + '\n\n' + formSummary }] },
          contents,
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
    return Response.json({
      reply: parsed.reply || '',
      fields: parsed.fields || {},
    })
  } catch (err) {
    return Response.json({ error: "Erreur lors de l'assistance : " + err.message }, { status: 500 })
  }
}
