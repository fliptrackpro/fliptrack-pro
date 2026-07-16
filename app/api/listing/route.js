import { requireUser } from '@/lib/apiAuth'
import { generateListings } from '@/lib/listingGenerator'

export async function POST(req) {
  const user = await requireUser(req)
  if (!user) {
    return Response.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { name, category, condition, price, description, photo_url } = await req.json()

  try {
    const parsed = await generateListings({ name, category, condition, price, description, photo_url })
    return Response.json(parsed)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
