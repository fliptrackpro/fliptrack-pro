'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'
import { useToast } from '@/components/Toast'

function maskEmail(email) {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return email
  return `${local.slice(0, 2)}${'•'.repeat(Math.max(local.length - 2, 3))}@${domain}`
}

export default function AccountPage() {
  const [user, setUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [currentUsername, setCurrentUsername] = useState(null)
  const [usernameInput, setUsernameInput] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const router = useRouter()
  const toast = useToast()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return router.push('/login')
      setUser(user)
      const { data } = await supabase.from('profiles').select('username').eq('user_id', user.id).maybeSingle()
      if (data?.username) {
        setCurrentUsername(data.username)
        setUsernameInput(data.username)
      }
    })
  }, [router])

  const handleSaveUsername = async () => {
    const clean = usernameInput.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      return toast('Le pseudo doit faire 3 à 20 caractères : lettres, chiffres, underscore.')
    }
    if (clean === currentUsername) return

    setSavingUsername(true)
    const { data: existing } = await supabase.from('profiles').select('user_id').eq('username', clean).maybeSingle()
    if (existing && existing.user_id !== user.id) {
      setSavingUsername(false)
      return toast('Ce pseudo est déjà pris.')
    }

    const { error } = await supabase.from('profiles').upsert({ user_id: user.id, username: clean })
    setSavingUsername(false)
    if (error) {
      toast('Erreur : ' + error.message)
    } else {
      setCurrentUsername(clean)
      toast('Pseudo enregistré', 'success')
    }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 6) return toast('Le mot de passe doit faire au moins 6 caractères.')
    if (newPassword !== confirmPassword) return toast('Les deux mots de passe ne correspondent pas.')

    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast('Erreur : ' + error.message)
    } else {
      toast('Mot de passe modifié', 'success')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  const handleDeleteData = async () => {
    if (!confirm('Supprimer TOUTES tes données (produits, ventes, photos) ? Cette action est irréversible.')) return
    if (!confirm('Vraiment sûr ? Tout ton historique de ventes et ton stock seront perdus définitivement.')) return

    setDeleting(true)

    const { data: files } = await supabase.storage.from('products').list(user.id, { limit: 1000 })
    if (files?.length) {
      await supabase.storage.from('products').remove(files.map(f => `${user.id}/${f.name}`))
    }

    const { error } = await supabase.from('products').delete().eq('user_id', user.id)
    if (error) {
      toast('Erreur : ' + error.message)
      setDeleting(false)
      return
    }

    toast('Toutes tes données ont été supprimées', 'success')
    setDeleting(false)
    router.push('/dashboard')
  }

  const inputClass = "w-full bg-white border border-[#eae5f0] rounded-xl px-4 py-3 text-[#241f2e] placeholder-[#b3aebf] focus:outline-none focus:border-[#6d5ce6] transition text-sm"
  const labelClass = "text-xs font-semibold text-[#8b8496] uppercase tracking-wider"

  if (!user) return (
    <div className="min-h-screen bg-[#f5f2ec] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#6d5ce6] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f2ec] text-[#241f2e] md:pl-56">
      <Nav />

      <header className="flex items-center justify-between px-4 sm:px-6 py-5 border-b border-[#eae5f0]">
        <div>
          <h1 className="text-xl font-serif italic">Compte</h1>
          <p className="text-[#8b8496] text-xs mt-0.5">{maskEmail(user.email)}</p>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 pb-24 md:pb-6 flex flex-col gap-4 max-w-3xl mx-auto w-full">

        <div className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold">Pseudo</h2>
            <p className="text-xs text-[#8b8496] mt-0.5">
              {currentUsername ? 'Utilisé pour te connecter, en plus de ton email.' : "Définis un pseudo pour pouvoir te connecter sans ton email."}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Pseudo</label>
            <input
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="ex: flipmaster"
              className={inputClass}
            />
          </div>
          <button
            onClick={handleSaveUsername}
            disabled={savingUsername || !usernameInput.trim() || usernameInput.trim().toLowerCase() === currentUsername}
            className="w-full bg-[#241f2e] hover:bg-[#3a3347] active:scale-[0.98] disabled:bg-[#eae5f0] disabled:text-[#c3bcf0] text-white font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            {savingUsername ? 'Enregistrement...' : currentUsername ? 'Modifier le pseudo' : 'Définir le pseudo'}
          </button>
        </div>

        <div className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-6 flex flex-col gap-4" style={{ animationDelay: '20ms' }}>
          <h2 className="text-sm font-bold">Changer le mot de passe</h2>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répète le mot de passe"
              className={inputClass}
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword}
            className="w-full bg-[#241f2e] hover:bg-[#3a3347] active:scale-[0.98] disabled:bg-[#eae5f0] disabled:text-[#c3bcf0] text-white font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            {savingPassword ? 'Enregistrement...' : 'Modifier le mot de passe'}
          </button>
        </div>

        <div className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-6" style={{ animationDelay: '40ms' }}>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="w-full bg-[#f5f2ec] hover:bg-[#eae5f0] text-[#241f2e] font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            Se déconnecter
          </button>
        </div>

        <div className="animate-rise-in bg-white rounded-2xl shadow-sm shadow-[#241f2e]/5 p-6 flex flex-col gap-3" style={{ animationDelay: '60ms' }}>
          <h2 className="text-sm font-bold text-[#e0654a]">Zone dangereuse</h2>
          <p className="text-xs text-[#8b8496]">
            Supprime définitivement tous tes produits, ventes et photos. Ton compte reste actif mais reparti de zéro.
          </p>
          <button
            onClick={handleDeleteData}
            disabled={deleting}
            className="w-full bg-[#e0654a]/10 hover:bg-[#e0654a]/20 text-[#e0654a] font-semibold rounded-xl px-4 py-3 transition text-sm disabled:opacity-50"
          >
            {deleting ? 'Suppression...' : 'Supprimer toutes mes données'}
          </button>
        </div>

      </main>
    </div>
  )
}
