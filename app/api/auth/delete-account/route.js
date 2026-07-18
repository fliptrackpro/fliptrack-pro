import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/apiAuth'

// Suppression COMPLÈTE du compte : photos Storage, puis compte auth (toutes les tables
// — products, sales, listings, profiles, ai_usage — cascadent depuis auth.users).
export async function POST(req) {
  const user = await requireUser(req)
  if (!user) {
    return Response.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY absente : suppression de compte indisponible.')
    return Response.json(
      { error: 'La suppression de compte est momentanément indisponible. Réessaie plus tard.' },
      { status: 503 }
    )
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey)

  try {
    // 1) Photos du dossier de l'utilisateur (pas de cascade côté Storage)
    const { data: files } = await admin.storage.from('products').list(user.id, { limit: 1000 })
    if (files?.length) {
      await admin.storage.from('products').remove(files.map(f => `${user.id}/${f.name}`))
    }

    // 2) Compte auth — cascade sur toutes les tables applicatives
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Échec suppression de compte :', err.message)
    return Response.json({ error: 'La suppression a échoué. Réessaie ou contacte le support.' }, { status: 500 })
  }
}
