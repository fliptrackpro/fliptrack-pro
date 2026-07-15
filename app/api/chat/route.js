import { requireUser } from '@/lib/apiAuth'

const SYSTEM_PROMPT = `Tu es un conseiller expert en revente d'articles d'occasion (Vinted, Leboncoin, Facebook Marketplace, eBay, Vestiaire Collective) en France. Tu aides un particulier qui fait du "flip" (achat/revente pour dégager une marge) à travers l'application FlipTrack.

Ton rôle : donner des conseils concrets et actionnables sur la fixation des prix, la rédaction d'annonces, les stratégies pour débloquer un article qui ne se vend pas, la négociation avec les acheteurs, le choix de la bonne plateforme selon le type d'article, et l'optimisation de la marge.

Réponds en français, de façon concise (quelques phrases, pas de pavé), directe et pratique. Pas d'emoji, pas de markdown (pas d'astérisques, pas de titres, pas de listes à puces avec des tirets ou des numéros) — uniquement du texte brut en phrases normales, ou des sauts de ligne simples si besoin de séparer des idées. Si la question sort du sujet de la revente/flip, réponds brièvement puis recentre poliment sur le sujet.`

export async function POST(req) {
  const user = await requireUser(req)
  if (!user) {
    return Response.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Clé API Gemini manquante côté serveur.' }, { status: 500 })
  }

  const { messages } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Messages requis.' }, { status: 400 })
  }

  const contents = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-20)
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '').slice(0, 4000) }],
    }))

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
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
      return Response.json({ error: 'Réponse vide.' }, { status: 502 })
    }

    return Response.json({ reply: text })
  } catch (err) {
    return Response.json({ error: 'Erreur : ' + err.message }, { status: 500 })
  }
}
