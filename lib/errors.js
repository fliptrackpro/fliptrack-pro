// Traduit les erreurs Supabase/Postgres en messages actionnables en français.
// Sans ça, l'utilisateur voit passer 4 secondes de
// `duplicate key value violates unique constraint "profiles_username_key"`.

const BY_CODE = {
  // Postgres
  '23505': 'Cette valeur existe déjà.',
  '23503': "Cet élément est lié à d'autres données et ne peut pas être supprimé seul.",
  '23514': "Une des valeurs saisies n'est pas acceptée (vérifie les montants).",
  '22P02': 'Une valeur numérique est mal formée.',
  // PostgREST / RLS
  '42501': "Tu n'as pas les droits pour cette action. Reconnecte-toi.",
  'PGRST301': 'Ta session a expiré. Reconnecte-toi.',
}

const BY_PATTERN = [
  [/profiles_username_key/i, 'Ce pseudo est déjà pris.'],
  [/duplicate key/i, 'Cette valeur existe déjà.'],
  [/row-level security|violates row-level/i, "Tu n'as pas les droits pour cette action. Reconnecte-toi."],
  [/jwt|token|expired|session/i, 'Ta session a expiré. Reconnecte-toi.'],
  [/failed to fetch|networkerror|network request failed/i, 'Connexion perdue. Vérifie ton réseau et réessaie.'],
  [/payload too large|exceeded the maximum|too large/i, 'Le fichier est trop lourd.'],
  [/storage|bucket/i, "L'envoi de la photo a échoué. Réessaie."],
  [/rate limit|too many requests/i, 'Trop de tentatives. Patiente un instant.'],
]

export function friendlyError(error, fallback = "Une erreur est survenue. Réessaie.") {
  if (!error) return fallback

  const code = error.code || error.status
  if (code && BY_CODE[String(code)]) return BY_CODE[String(code)]

  const raw = [error.message, error.details, error.hint].filter(Boolean).join(' ')
  if (!raw) return fallback

  for (const [pattern, message] of BY_PATTERN) {
    if (pattern.test(raw)) return message
  }

  // Message déjà rédigé en français par nos soins (ex: validations côté client) : on le garde.
  if (/[éèêàçùô]/i.test(raw) || /^[A-ZÉÀ][^A-Z]{10,}$/.test(raw)) return raw

  return fallback
}
