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
    sitemap: 'https://fliptrack-pro-9ziq.vercel.app/sitemap.xml',
  }
}
