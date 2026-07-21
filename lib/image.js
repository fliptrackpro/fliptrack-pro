// Redimensionne et compresse une photo côté navigateur avant envoi.
// Une photo de téléphone fait souvent 4000 px / 3-5 Mo ; on n'a jamais besoin de ça
// pour une annonce. Gain sur trois fronts : stockage Supabase, temps d'affichage,
// et taille du payload envoyé à l'IA (qui était plafonné à 10 Mo par image).
const MAX_DIM = 1600
const QUALITY = 0.82

export async function compressImage(file, { maxDim = MAX_DIM, quality = QUALITY } = {}) {
  // Les formats non-bitmap (ou navigateurs sans support) passent tels quels
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif') return file

  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    // Déjà assez petite : ne pas recompresser (ça dégraderait sans gain)
    if (width <= maxDim && height <= maxDim && file.size < 600 * 1024) {
      bitmap.close?.()
      return file
    }

    const scale = Math.min(1, maxDim / Math.max(width, height))
    const w = Math.round(width * scale)
    const h = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    // En cas d'échec (format exotique, canvas indisponible), on garde l'original
    return file
  }
}

export async function compressImages(files, opts) {
  return Promise.all(files.map(f => compressImage(f, opts)))
}
