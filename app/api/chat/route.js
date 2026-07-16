import { requireUser, authedClient, checkAiQuota } from '@/lib/apiAuth'
import { buildContextSummary } from '@/lib/margin'
import { generateListings } from '@/lib/listingGenerator'

const BASE_SYSTEM_PROMPT = `Tu t'appelles Flip. Tu es un conseiller expert en revente d'articles d'occasion (Vinted, Leboncoin, Facebook Marketplace, eBay, Vestiaire Collective) en France. Tu aides un particulier qui fait du "flip" (achat/revente pour dégager une marge) à travers l'application FlipTrack. Si on te demande ton nom, réponds "Flip".

Ton rôle : donner des conseils concrets et actionnables sur la fixation des prix, la rédaction d'annonces, les stratégies pour débloquer un article qui ne se vend pas, la négociation avec les acheteurs, le choix de la bonne plateforme selon le type d'article, et l'optimisation de la marge. Tu peux aussi PROPOSER une action pour l'utilisateur via deux outils : générer une annonce prête à publier pour un article de son stock, et marquer un article comme reposté. Utilise ces outils quand l'utilisateur te le demande explicitement ou clairement (ex: "génère une annonce pour mes Nike", "marque le sac en cuir comme reposté"). Ne les utilise jamais sans demande claire. L'action n'est PAS encore exécutée quand tu appelles l'outil — l'utilisateur devra confirmer via un bouton avant que ça se fasse réellement, donc formule ta réponse comme une proposition ("je te propose de...", "veux-tu que je...") plutôt qu'une confirmation que c'est fait.

Tu as accès à un aperçu des données réelles actuelles de l'utilisateur (stock, ventes, articles qui stagnent). Utilise-les activement : cite les articles concrets par leur nom quand c'est pertinent, base tes conseils sur ses vrais chiffres plutôt que de rester générique.

Réponds en français, de façon concise (quelques phrases, pas de pavé), directe et pratique. Pas d'emoji, pas de markdown (pas d'astérisques, pas de titres, pas de listes à puces avec des tirets ou des numéros) — uniquement du texte brut en phrases normales. Si la question sort du sujet de la revente/flip, réponds brièvement puis recentre poliment sur le sujet.`

const TOOLS = [{
  function_declarations: [
    {
      name: 'generate_listing',
      description: "Génère un titre et un descriptif d'annonce prêts à publier (Vinted, Leboncoin, Facebook Marketplace, eBay, Vestiaire Collective) pour un article du stock de l'utilisateur. À utiliser uniquement quand l'utilisateur demande explicitement de rédiger/générer une annonce pour un article précis.",
      parameters: {
        type: 'object',
        properties: {
          product_name: { type: 'string', description: "Le nom (ou une partie du nom) de l'article, tel que mentionné par l'utilisateur." },
          price: { type: 'number', description: "Le prix de vente visé en euros, si l'utilisateur le précise." },
        },
        required: ['product_name'],
      },
    },
    {
      name: 'mark_reposted',
      description: "Marque un article du stock comme reposté (republié) aujourd'hui. À utiliser uniquement quand l'utilisateur demande explicitement de marquer un article comme reposté/relisté/bumpé.",
      parameters: {
        type: 'object',
        properties: {
          product_name: { type: 'string', description: "Le nom (ou une partie du nom) de l'article, tel que mentionné par l'utilisateur." },
        },
        required: ['product_name'],
      },
    },
  ],
}]

function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function findStockProduct(products, query) {
  const q = normalize(query)
  const matches = products.filter(p => p.status === 'stock' && normalize(p.name).includes(q))
  if (matches.length === 1) return { match: matches[0] }
  if (matches.length === 0) return { error: 'not_found' }
  return { error: 'ambiguous', candidates: matches.map(p => p.name) }
}

// Résout la cible (fuzzy match + prix) SANS exécuter d'action — pas d'écriture DB, pas d'appel de génération.
function resolveTool(name, args, products) {
  const { match, error, candidates } = findStockProduct(products, args.product_name)
  if (error === 'not_found') return { success: false, reason: `Aucun article en stock ne correspond à "${args.product_name}".` }
  if (error === 'ambiguous') return { success: false, reason: `Plusieurs articles correspondent : ${candidates.join(', ')}. Précise lequel.` }

  if (name === 'generate_listing') {
    const price = args.price ?? (match.estimated_price_min != null && match.estimated_price_max != null
      ? Math.round((match.estimated_price_min + match.estimated_price_max) / 2)
      : null)
    if (!price) return { success: false, reason: `Aucun prix disponible pour "${match.name}". Demande à l'utilisateur un prix de vente visé.` }
    return { success: true, proposed: true, product_id: match.id, product_name: match.name, price }
  }

  if (name === 'mark_reposted') {
    return { success: true, proposed: true, product_id: match.id, product_name: match.name }
  }

  return { success: false, reason: 'Outil inconnu.' }
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

  const body = await req.json()
  const supabase = authedClient(req)

  // --- Exécution d'une action confirmée par l'utilisateur (bouton "Confirmer") ---
  if (body.confirmAction) {
    const { name, args } = body.confirmAction
    const { data: products } = await supabase.from('products').select('*').eq('user_id', user.id)
    const product = (products || []).find(p => p.id === args.product_id && p.status === 'stock')
    if (!product) {
      return Response.json({ error: "Cet article n'est plus disponible en stock (déjà vendu ou supprimé)." }, { status: 400 })
    }

    if (name === 'mark_reposted') {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('products')
        .update({ last_reposted_at: now })
        .eq('id', product.id)
        .eq('user_id', user.id)
      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({
        reply: `C'est fait, « ${product.name} » est marqué comme reposté.`,
        action: { type: 'mark_reposted', product_name: product.name },
      })
    }

    if (name === 'generate_listing') {
      const quotaError = await checkAiQuota(req)
      if (quotaError) return quotaError
      try {
        const listings = await generateListings({
          name: product.name,
          category: product.category,
          condition: product.condition,
          price: args.price,
          description: product.description,
          photo_url: product.photo_url,
        })
        return Response.json({
          reply: `Voilà l'annonce pour « ${product.name} » à ${args.price}€.`,
          action: { type: 'generate_listing', product_name: product.name, listings },
        })
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 })
      }
    }

    return Response.json({ error: 'Action inconnue.' }, { status: 400 })
  }

  // --- Flux conversationnel normal (propose une action, ne l'exécute pas) ---
  const quotaError = await checkAiQuota(req)
  if (quotaError) return quotaError

  const { messages } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Messages requis.' }, { status: 400 })
  }

  let products = []
  let contextBlock = ''
  try {
    const { data } = await supabase.from('products').select('*, sales(*)').eq('user_id', user.id)
    products = data || []
    const sales = products.flatMap(p => p.sales || [])
    contextBlock = `\n\nDonnées actuelles de l'utilisateur :\n${buildContextSummary(products, sales)}`
  } catch {
    // pas de contexte disponible, on continue sans
  }

  const contents = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-20)
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '').slice(0, 4000) }],
    }))

  const callGemini = (extraContents = []) => fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: BASE_SYSTEM_PROMPT + contextBlock }] },
        contents: [...contents, ...extraContents],
        tools: TOOLS,
      }),
    }
  )

  try {
    const firstRes = await callGemini()
    if (!firstRes.ok) {
      const errText = await firstRes.text()
      return Response.json({ error: `Erreur Gemini : ${errText}` }, { status: 502 })
    }
    const firstData = await firstRes.json()
    const candidateParts = firstData?.candidates?.[0]?.content?.parts || []
    const functionCallPart = candidateParts.find(p => p.functionCall)

    if (!functionCallPart) {
      const text = candidateParts.find(p => p.text)?.text
      if (!text) return Response.json({ error: 'Réponse vide.' }, { status: 502 })
      return Response.json({ reply: text })
    }

    const { name, args } = functionCallPart.functionCall
    const resolved = resolveTool(name, args || {}, products)

    const secondRes = await callGemini([
      { role: 'model', parts: [functionCallPart] },
      { role: 'function', parts: [{ functionResponse: { name, response: resolved } }] },
    ])

    if (!secondRes.ok) {
      const errText = await secondRes.text()
      return Response.json({ error: `Erreur Gemini : ${errText}` }, { status: 502 })
    }
    const secondData = await secondRes.json()
    const finalText = secondData?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text
      || (resolved.success ? `Je te propose : ${name === 'generate_listing' ? 'générer une annonce pour' : 'marquer comme reposté'} « ${resolved.product_name} ». Confirme ?` : resolved.reason)

    const pendingAction = resolved.success
      ? {
        name,
        args: name === 'generate_listing'
          ? { product_id: resolved.product_id, price: resolved.price }
          : { product_id: resolved.product_id },
        product_name: resolved.product_name,
        price: resolved.price,
      }
      : undefined

    return Response.json({ reply: finalText, pendingAction })
  } catch (err) {
    return Response.json({ error: 'Erreur : ' + err.message }, { status: 500 })
  }
}
