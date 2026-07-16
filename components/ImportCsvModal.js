'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { parseCSV, normalizeHeader } from '@/lib/csv'
import { useToast } from '@/components/Toast'

const CATEGORIES = ['Vêtements', 'Chaussures', 'Électronique', 'Jeux vidéo', 'Maison', 'Sport', 'Autre']
const CONDITIONS = ['Neuf avec étiquette', 'Très bon état', 'Bon état', 'État correct']

function downloadTemplate() {
  const headers = ['Nom', 'Catégorie', 'État', "Prix d'achat", "Frais d'achat", 'Description']
  const example = ['Nike Air Max 90 blanche T42', 'Chaussures', 'Bon état', '35', '5', 'Baskets en bon état, semelle propre']
  const csv = [headers, example]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fliptrack-modele-import.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ImportCsvModal({ onClose, onImported }) {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [fileError, setFileError] = useState('')
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setFileError('')
    setRows([])

    const text = await file.text()
    const table = parseCSV(text)
    if (table.length < 2) {
      setFileError('Fichier vide ou illisible.')
      return
    }

    const headers = table[0].map(normalizeHeader)
    const idx = {
      name: headers.findIndex(h => h.includes('nom')),
      category: headers.findIndex(h => h.includes('categorie')),
      condition: headers.findIndex(h => h.includes('etat')),
      price: headers.findIndex(h => h.includes('prix')),
      fees: headers.findIndex(h => h.includes('frais')),
      description: headers.findIndex(h => h.includes('description')),
    }

    if (idx.name === -1 || idx.price === -1) {
      setFileError('Colonnes "Nom" et "Prix d\'achat" introuvables. Télécharge le modèle ci-dessous pour voir le format attendu.')
      return
    }

    const parsedRows = table.slice(1).map(r => {
      const name = r[idx.name] || ''
      const priceRaw = (r[idx.price] || '').replace(',', '.').replace(/[^\d.]/g, '')
      const price = parseFloat(priceRaw)
      const feesRaw = idx.fees !== -1 ? (r[idx.fees] || '').replace(',', '.').replace(/[^\d.]/g, '') : ''
      const fees = parseFloat(feesRaw) || 0
      const rawCategory = idx.category !== -1 ? (r[idx.category] || '') : ''
      const rawCondition = idx.condition !== -1 ? (r[idx.condition] || '') : ''
      const category = CATEGORIES.find(c => normalizeHeader(c) === normalizeHeader(rawCategory)) || ''
      const condition = CONDITIONS.find(c => normalizeHeader(c) === normalizeHeader(rawCondition)) || ''
      const description = idx.description !== -1 ? (r[idx.description] || '') : ''
      const valid = name.trim() !== '' && !isNaN(price) && price > 0
      return { name: name.trim(), category, condition, purchase_price: price, purchase_fees: fees, description, valid }
    })

    setRows(parsedRows)
  }

  const validRows = rows.filter(r => r.valid)

  const handleImport = async () => {
    if (!validRows.length || importing) return
    setImporting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setImporting(false)
      return toast('Session expirée, reconnecte-toi.')
    }

    const payload = validRows.map(r => ({
      user_id: user.id,
      name: r.name,
      category: r.category,
      condition: r.condition,
      purchase_price: r.purchase_price,
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_fees: r.purchase_fees,
      status: 'stock',
      description: r.description || null,
      photo_url: null,
      photo_urls: [],
    }))

    const { error } = await supabase.from('products').insert(payload)
    setImporting(false)

    if (error) {
      toast('Erreur import : ' + error.message)
      return
    }

    toast(`${validRows.length} produit${validRows.length > 1 ? 's' : ''} importé${validRows.length > 1 ? 's' : ''}`, 'success')
    onImported()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#241f2e]/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="animate-pop-in bg-white rounded-3xl shadow-2xl shadow-[#241f2e]/30 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-[#eae5f0] flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-serif italic">Importer des produits</h2>
            <p className="text-xs text-[#8b8496] mt-0.5">Depuis un fichier CSV (nom, catégorie, état, prix)</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[#f5f2ec] flex items-center justify-center text-[#8b8496] transition">
            ✕
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 flex flex-col gap-4">
          <label className="flex items-center gap-3 cursor-pointer bg-[#f5f2ec] border border-dashed border-[#d6cfe8] rounded-xl px-4 py-3 hover:border-[#6d5ce6]/50 transition">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#4a4356]">{fileName || 'Choisir un fichier .csv'}</p>
              <p className="text-xs text-[#b3aebf]">Colonnes attendues : Nom, Catégorie, État, Prix d'achat, Frais d'achat, Description</p>
            </div>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          </label>

          <button onClick={downloadTemplate} className="text-xs text-[#6d5ce6] hover:underline self-start">
            Télécharger un modèle CSV ↓
          </button>

          {fileError && (
            <p className="text-xs text-[#e0654a] bg-[#e0654a]/10 rounded-xl px-3 py-2">{fileError}</p>
          )}

          {rows.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-[#8b8496] uppercase tracking-wider">
                {validRows.length} ligne{validRows.length > 1 ? 's' : ''} valide{validRows.length > 1 ? 's' : ''} sur {rows.length}
              </p>
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                {rows.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs ${
                      r.valid ? 'bg-[#f5f2ec]' : 'bg-[#e0654a]/10'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`font-medium truncate ${r.valid ? 'text-[#241f2e]' : 'text-[#e0654a]'}`}>
                        {r.name || '(nom manquant)'}
                      </p>
                      <p className="text-[#8b8496] truncate">
                        {r.category || 'Sans catégorie'} · {r.condition || 'État non précisé'}
                      </p>
                    </div>
                    <span className={`flex-shrink-0 font-semibold ${r.valid ? 'text-[#4a8a6f]' : 'text-[#e0654a]'}`}>
                      {r.valid ? `${r.purchase_price}€` : 'ignorée'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#eae5f0] flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-[#f5f2ec] hover:bg-[#eae5f0] text-[#655e72] font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleImport}
            disabled={!validRows.length || importing}
            className="flex-1 bg-[#241f2e] hover:bg-[#3a3347] disabled:bg-[#eae5f0] disabled:text-[#c3bcf0] text-white font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            {importing ? 'Import...' : `Importer${validRows.length ? ` (${validRows.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
