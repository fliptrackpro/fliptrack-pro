const BASE = 'https://fliptrack-pro-9ziq.vercel.app'

export default function sitemap() {
  return [
    { url: `${BASE}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE}/login`, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
