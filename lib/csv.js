// Parseur CSV minimal (gère guillemets, virgules/points-virgules, BOM) sans dépendance externe
export function parseCSV(text) {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // Compte sur tout le texte (pas juste la 1ère ligne) : une ligne de titre ou vide en tête
  // n'a souvent aucun délimiteur et fausserait la détection.
  const commas = (clean.match(/,/g) || []).length
  const semicolons = (clean.match(/;/g) || []).length
  const delimiter = semicolons > commas ? ';' : ','

  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const next = clean[i + 1]
    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++ }
      else if (char === '"') { inQuotes = false }
      else { field += char }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field.trim()); field = ''
    } else if (char === '\n') {
      row.push(field.trim()); rows.push(row); row = []; field = ''
    } else {
      field += char
    }
  }
  if (field.length || row.length) { row.push(field.trim()); rows.push(row) }

  return rows.filter(r => r.some(c => c !== ''))
}

export function normalizeHeader(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

// Lit un fichier texte en essayant l'UTF-8, et retombe sur Windows-1252 (courant pour les
// exports Excel/Numbers français) si l'UTF-8 produit des caractères de remplacement (�).
export async function readFileAsText(file) {
  const buffer = await file.arrayBuffer()
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer)
  if (utf8.includes('�')) {
    try {
      return new TextDecoder('windows-1252').decode(buffer)
    } catch {
      return utf8
    }
  }
  return utf8
}

// Repère la vraie ligne d'en-têtes même précédée de lignes de titre/vides, en cherchant la
// première ligne dont plusieurs cellules ressemblent à des noms de colonnes connus.
const HEADER_HINTS = ['nom', 'produit', 'prix', 'categorie', 'etat', 'date', 'quantite', 'operation', 'enseigne']

export function findHeaderRowIndex(table) {
  const limit = Math.min(table.length, 20)
  for (let i = 0; i < limit; i++) {
    const cells = table[i].map(normalizeHeader)
    const hits = cells.filter(c => HEADER_HINTS.some(h => c.includes(h))).length
    if (hits >= 2) return i
  }
  return 0
}

// "314,40 €" / "1 500,00 €" (espace normale ou insécable comme séparateur de milliers) -> 314.4
export function parseFrenchPrice(raw) {
  const cleaned = String(raw ?? '').replace(/[€?\s]/g, '').replace(',', '.')
  if (!cleaned) return null
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// "07/01/2026" -> "2026-01-07"
export function parseFrenchDate(raw) {
  const m = String(raw ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, d, mo, y] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// Détecte les index de colonnes d'un fichier "historique" (Date/Produit/Enseigne/Opérations/
// Prix à l'Unité/Quantité/Prix de Vente Réalisé). Renvoie null si le fichier n'a pas cette forme
// (pas de colonne Opérations Achat/Vente ni de prix unitaire d'achat identifiable).
export function detectLedgerColumns(headers) {
  const idx = {
    date: headers.findIndex(h => h.includes('date')),
    name: headers.findIndex(h => h.includes('produit') || h.includes('nom')),
    operation: headers.findIndex(h => h.includes('operation')),
    unitPrice: headers.findIndex(h => h.includes('prix') && h.includes('unit') && !h.includes('vente')),
    quantity: headers.findIndex(h => h.includes('quantite')),
    saleUnitPrice: headers.findIndex(h => h.includes('realise') && h.includes('unit')),
  }
  if (idx.name === -1 || idx.operation === -1 || idx.unitPrice === -1) return null
  return idx
}

// Éclate chaque ligne selon sa quantité, puis apparie en FIFO (ordre d'apparition dans le
// fichier = ordre chronologique) chaque unité achetée avec la vente la plus ancienne du même
// produit. Une unité achetée sans vente correspondante reste "en stock" ; une vente sans achat
// correspondant est comptée dans unmatchedSales et ignorée (donnée incohérente).
export function buildLedgerImport(table, headerRowIdx, idx) {
  const units = []
  for (const r of table.slice(headerRowIdx + 1)) {
    const name = (r[idx.name] || '').trim()
    if (!name) continue
    const opRaw = normalizeHeader(r[idx.operation] || '')
    const type = opRaw.includes('vente') ? 'vente' : opRaw.includes('achat') ? 'achat' : null
    if (!type) continue

    const qty = Math.max(parseInt((r[idx.quantity] || '1').replace(/[^\d]/g, ''), 10) || 1, 1)
    const unitPrice = parseFrenchPrice(r[idx.unitPrice])
    const saleUnitPrice = idx.saleUnitPrice !== -1 ? parseFrenchPrice(r[idx.saleUnitPrice]) : null
    const date = idx.date !== -1 ? parseFrenchDate(r[idx.date]) : null

    for (let i = 0; i < qty; i++) {
      units.push({ name, type, date, unitPrice, saleUnitPrice })
    }
  }

  const byName = new Map()
  for (const u of units) {
    const key = normalizeHeader(u.name)
    if (!byName.has(key)) byName.set(key, { name: u.name, achats: [], ventes: [] })
    byName.get(key)[u.type === 'achat' ? 'achats' : 'ventes'].push(u)
  }

  const results = []
  let unmatchedSales = 0

  for (const group of byName.values()) {
    const ventes = [...group.ventes]
    for (const achat of group.achats) {
      const vente = ventes.shift()
      if (vente) {
        results.push({
          kind: 'vendu',
          name: group.name,
          purchase_price: achat.unitPrice,
          purchase_date: achat.date,
          sale_price: vente.saleUnitPrice,
          sale_date: vente.date,
          valid: achat.unitPrice != null && vente.saleUnitPrice != null,
        })
      } else {
        results.push({
          kind: 'stock',
          name: group.name,
          purchase_price: achat.unitPrice,
          purchase_date: achat.date,
          valid: achat.unitPrice != null,
        })
      }
    }
    unmatchedSales += ventes.length
  }

  return { results, unmatchedSales }
}
