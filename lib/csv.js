// Parseur CSV minimal (gère guillemets, virgules/points-virgules, BOM) sans dépendance externe
export function parseCSV(text) {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const firstLine = clean.split('\n')[0] || ''
  const commas = (firstLine.match(/,/g) || []).length
  const semicolons = (firstLine.match(/;/g) || []).length
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
