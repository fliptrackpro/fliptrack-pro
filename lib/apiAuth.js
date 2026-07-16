import { createClient } from '@supabase/supabase-js'

export async function requireUser(req) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export function authedClient(req) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

const DAILY_AI_LIMIT = parseInt(process.env.DAILY_AI_LIMIT || '100', 10)

// Incrémente le compteur du jour et renvoie null si OK, ou une Response 429 si le plafond est atteint.
// Si la table/fonction n'existe pas encore (migration non exécutée), on laisse passer.
export async function checkAiQuota(req) {
  try {
    const supabase = authedClient(req)
    const { data: count, error } = await supabase.rpc('increment_ai_usage')
    if (error) return null
    if (count > DAILY_AI_LIMIT) {
      return Response.json(
        { error: `Limite quotidienne d'utilisation de l'IA atteinte (${DAILY_AI_LIMIT} requêtes/jour). Réessaie demain.` },
        { status: 429 }
      )
    }
    return null
  } catch {
    return null
  }
}
