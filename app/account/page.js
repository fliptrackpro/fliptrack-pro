'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/BottomNav'
import { useToast } from '@/components/Toast'
import { friendlyError } from '@/lib/errors'
import ThemeToggle from '@/components/ThemeToggle'
import ConfirmDialog from '@/components/ConfirmDialog'

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
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [confirmMode, setConfirmMode] = useState(null) // 'data' | 'account'
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
      toast(friendlyError(error))
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
      toast(friendlyError(error))
    } else {
      toast('Mot de passe modifié', 'success')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }

  const handleDeleteData = async () => {
    setConfirmMode(null)
    setDeleting(true)

    const { data: files } = await supabase.storage.from('products').list(user.id, { limit: 1000 })
    if (files?.length) {
      await supabase.storage.from('products').remove(files.map(f => `${user.id}/${f.name}`))
    }

    const { error } = await supabase.from('products').delete().eq('user_id', user.id)
    if (error) {
      toast(friendlyError(error))
      setDeleting(false)
      return
    }

    toast('Toutes tes données ont été supprimées', 'success')
    setDeleting(false)
    router.push('/dashboard')
  }

  const handleDeleteAccount = async () => {
    setConfirmMode(null)
    setDeletingAccount(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'La suppression a échoué.')

      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      toast(friendlyError(err))
      setDeletingAccount(false)
    }
  }

  const inputClass = "w-full bg-surface border border-line rounded-xl px-4 py-3 text-ink placeholder-faint focus:outline-none focus:border-accent transition text-sm"
  const labelClass = "text-xs font-semibold text-muted uppercase tracking-wider"

  if (!user) return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-canvas text-ink md:pl-56">
      <Nav />

      <header className="flex items-center justify-between px-4 sm:px-6 py-5 border-b border-line">
        <div>
          <h1 className="text-xl font-serif italic">Compte</h1>
          <p className="text-muted text-xs mt-0.5">{maskEmail(user.email)}</p>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 pb-24 md:pb-6 flex flex-col gap-4 max-w-3xl mx-auto w-full">

        <div className="animate-rise-in bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-6 flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-bold">Apparence</h2>
            <p className="text-xs text-muted mt-0.5">Choisis le thème clair, sombre, ou celui de ton appareil.</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="animate-rise-in bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-6 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold">Pseudo</h2>
            <p className="text-xs text-muted mt-0.5">
              {currentUsername ? 'Utilisé pour te connecter, en plus de ton email.' : "Définis un pseudo pour pouvoir te connecter sans ton email."}
            </p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Pseudo</span>
            <input
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="ex: flipmaster"
              className={inputClass}
            />
          </label>
          <button
            onClick={handleSaveUsername}
            disabled={savingUsername || !usernameInput.trim() || usernameInput.trim().toLowerCase() === currentUsername}
            className="w-full bg-inkd hover:bg-inkdh active:scale-[0.98] disabled:bg-line disabled:text-disabled text-white font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            {savingUsername ? 'Enregistrement...' : currentUsername ? 'Modifier le pseudo' : 'Définir le pseudo'}
          </button>
        </div>

        <div className="animate-rise-in bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-6 flex flex-col gap-4" style={{ animationDelay: '20ms' }}>
          <h2 className="text-sm font-bold">Changer le mot de passe</h2>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Nouveau mot de passe</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Au moins 6 caractères"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Confirmer le mot de passe</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répète le mot de passe"
              className={inputClass}
            />
          </label>
          <button
            onClick={handleChangePassword}
            disabled={savingPassword || !newPassword}
            className="w-full bg-inkd hover:bg-inkdh active:scale-[0.98] disabled:bg-line disabled:text-disabled text-white font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            {savingPassword ? 'Enregistrement...' : 'Modifier le mot de passe'}
          </button>
        </div>

        <div className="animate-rise-in bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-6" style={{ animationDelay: '40ms' }}>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="w-full bg-canvas hover:bg-line text-ink font-semibold rounded-xl px-4 py-3 transition text-sm"
          >
            Se déconnecter
          </button>
        </div>

        <div className="animate-rise-in bg-surface rounded-2xl shadow-sm shadow-inkd/5 p-6 flex flex-col gap-3" style={{ animationDelay: '60ms' }}>
          <h2 className="text-sm font-bold text-coral">Zone dangereuse</h2>
          <p className="text-xs text-muted">
            Supprime définitivement tous tes produits, ventes et photos. Ton compte reste actif mais reparti de zéro.
          </p>
          <button
            onClick={() => setConfirmMode('data')}
            disabled={deleting || deletingAccount}
            className="w-full bg-coral/10 hover:bg-coral/20 text-coral font-semibold rounded-xl px-4 py-3 transition text-sm disabled:opacity-50"
          >
            {deleting ? 'Suppression...' : 'Supprimer toutes mes données'}
          </button>

          <div className="border-t border-line my-1" />

          <p className="text-xs text-muted">
            Ou supprime définitivement ton compte : données, photos et identifiants de connexion. Rien ne sera conservé.
          </p>
          <button
            onClick={() => setConfirmMode('account')}
            disabled={deleting || deletingAccount}
            className="w-full bg-coralbtn hover:opacity-90 text-white font-semibold rounded-xl px-4 py-3 transition text-sm disabled:opacity-50"
          >
            {deletingAccount ? 'Suppression du compte...' : 'Supprimer mon compte définitivement'}
          </button>
        </div>

        <ConfirmDialog
          open={confirmMode === 'data'}
          destructive
          title="Supprimer toutes tes données ?"
          message="Ton stock, ton historique de ventes et tes photos seront effacés définitivement. Ton compte restera actif, mais reparti de zéro."
          confirmLabel="Tout supprimer"
          requireText="SUPPRIMER"
          busy={deleting}
          onConfirm={handleDeleteData}
          onCancel={() => setConfirmMode(null)}
        />

        <ConfirmDialog
          open={confirmMode === 'account'}
          destructive
          title="Supprimer ton compte ?"
          message="Données, photos et identifiants seront effacés. Tu ne pourras plus te connecter et rien ne sera récupérable."
          confirmLabel="Supprimer mon compte"
          requireText="SUPPRIMER"
          busy={deletingAccount}
          onConfirm={handleDeleteAccount}
          onCancel={() => setConfirmMode(null)}
        />

      </main>
    </div>
  )
}
