// URL publique du site, résolue au build.
//
// Elle était codée en dur ; le projet a été renommé côté Vercel et le sitemap
// comme les métadonnées Open Graph ont continué d'annoncer un domaine mort.
// On la dérive donc de l'environnement, avec un repli explicite.
//
// - NEXT_PUBLIC_SITE_URL            : à définir le jour où tu auras un vrai domaine
// - VERCEL_PROJECT_PRODUCTION_URL   : fourni par Vercel, suit les renommages du projet
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://fliptrackpro.vercel.app')
