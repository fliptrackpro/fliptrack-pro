import { createClient } from '@supabase/supabase-js'

// Réponse volontairement générique dans tous les cas d'échec (pseudo inconnu, mot de
// passe faux, service role absent...) pour ne pas laisser deviner quels pseudos existent.
const INVALID = () => Response.json({ error: 'Identifiants invalides.' }, { status: 401 })

export async function POST(req) {
  const body = await req.json()
  const identifier = (body.identifier || '').trim()
  const password = body.password || ''
  if (!identifier || !password) return INVALID()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let email = identifier

  // Un identifiant sans "@" est traité comme un pseudo : on résout l'email associé
  // côté serveur via la clé service role (jamais exposée au client), pour ne pas
  // révéler l'email d'un compte à partir de son pseudo.
  if (!identifier.includes('@')) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return Response.json(
        { error: "Connexion par pseudo indisponible : SUPABASE_SERVICE_ROLE_KEY n'est pas configurée côté serveur." },
        { status: 500 }
      )
    }

    const admin = createClient(url, serviceKey)
    const { data: profile } = await admin
      .from('profiles')
      .select('user_id')
      .eq('username', identifier.toLowerCase())
      .maybeSingle()

    if (!profile) return INVALID()

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(profile.user_id)
    if (userErr || !userData?.user?.email) return INVALID()
    email = userData.user.email
  }

  const anon = createClient(url, anonKey)
  const { data, error } = await anon.auth.signInWithPassword({ email, password })
  if (error || !data?.session) return INVALID()

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}
