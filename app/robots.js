import { SITE_URL } from '@/lib/siteUrl'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Pages privées / sans intérêt pour les moteurs
        disallow: ['/dashboard', '/products', '/sales', '/commandes', '/account', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
