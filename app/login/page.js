'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogoMark } from '@/components/Logo'
import { isDisposableEmail } from '@/lib/disposableEmails'

const inputClass = "w-full bg-surface border border-line rounded-xl px-4 py-3 text-ink placeholder-faint focus:outline-none focus:border-accent transition text-sm"
const labelClass = "text-xs font-semibold text-muted uppercase tracking-wider"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('sign_in') // sign_in | sign_up | forgot
  const [identifier, setIdentifier] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push('/dashboard')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') router.push('/dashboard')
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setMessage('')
  }

  const handleSignIn = async () => {
    if (!identifier.trim() || !password) return
    setError('')
    setLoading(true)
    try {
      if (identifier.includes('@')) {
        const { error } = await supabase.auth.signInWithPassword({ email: identifier.trim(), password })
        if (error) throw new Error('Identifiants invalides.')
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: identifier.trim(), password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Identifiants invalides.')
        const { error } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
        if (error) throw error
      }
      // La redirection est gérée par onAuthStateChange (SIGNED_IN)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setError('')
    setMessage('')

    const cleanUsername = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      return setError('Le pseudo doit faire 3 à 20 caractères : lettres, chiffres, underscore.')
    }
    if (!email.includes('@')) {
      return setError('Adresse email invalide.')
    }
    if (isDisposableEmail(email)) {
      return setError("Merci d'utiliser une adresse email permanente (les adresses jetables ne sont pas acceptées).")
    }
    if (password.length < 6) {
      return setError('Le mot de passe doit faire au moins 6 caractères.')
    }

    setLoading(true)
    try {
      const { data: existing } = await supabase.from('profiles').select('user_id').eq('username', cleanUsername).maybeSingle()
      if (existing) throw new Error('Ce pseudo est déjà pris.')

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: { username: cleanUsername },
        },
      })
      if (error) throw error

      setMessage('Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.')
      switchMode('sign_in')
      setIdentifier(email.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async () => {
    if (!forgotEmail.includes('@')) return setError('Adresse email invalide.')
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/account`,
      })
      if (error) throw error
      setMessage('Si un compte existe avec cet email, un lien de réinitialisation vient de lui être envoyé.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e, submit) => {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-8 shadow-xl shadow-inkd/5">

        <div className="text-center mb-8">
          <LogoMark className="w-14 h-14 mx-auto mb-4 rounded-[28%] shadow-lg shadow-accent/25" />
          <h1 className="text-3xl font-serif italic text-ink">
            Flip<span className="not-italic font-sans font-bold text-accent">Track</span>
          </h1>
          <p className="text-muted mt-2">
            Suis tes achats, tes ventes et ta marge
          </p>
        </div>

        {error && (
          <p className="text-xs text-coral bg-coral/10 rounded-xl px-3 py-2 mb-4">{error}</p>
        )}
        {message && (
          <p className="text-xs text-sage bg-sage/10 rounded-xl px-3 py-2 mb-4">{message}</p>
        )}

        {mode === 'sign_in' && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Email ou pseudo</span>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSignIn)}
                placeholder="toi@exemple.com ou pseudo"
                className={inputClass}
                autoComplete="username"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSignIn)}
                placeholder="••••••••"
                className={inputClass}
                autoComplete="current-password"
              />
            </label>
            <button
              onClick={handleSignIn}
              disabled={loading || !identifier.trim() || !password}
              className="w-full bg-inkd hover:bg-inkdh active:scale-[0.98] disabled:bg-line disabled:text-disabled text-white font-semibold rounded-xl px-4 py-3 transition text-sm"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
            <div className="flex items-center justify-between text-xs">
              <button onClick={() => switchMode('forgot')} className="text-muted hover:text-accent transition">
                Mot de passe oublié ?
              </button>
              <button onClick={() => switchMode('sign_up')} className="text-muted hover:text-accent transition">
                Pas de compte ? S'inscrire
              </button>
            </div>
          </div>
        )}

        {mode === 'sign_up' && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Pseudo</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: flipmaster"
                className={inputClass}
                autoComplete="username"
              />
              <p className="text-[11px] text-faint">3 à 20 caractères : lettres, chiffres, underscore. Servira aussi à te connecter.</p>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.com"
                className={inputClass}
                autoComplete="email"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleSignUp)}
                placeholder="Au moins 6 caractères"
                className={inputClass}
                autoComplete="new-password"
              />
            </label>
            <button
              onClick={handleSignUp}
              disabled={loading || !username.trim() || !email.trim() || !password}
              className="w-full bg-inkd hover:bg-inkdh active:scale-[0.98] disabled:bg-line disabled:text-disabled text-white font-semibold rounded-xl px-4 py-3 transition text-sm"
            >
              {loading ? 'Création...' : "S'inscrire"}
            </button>
            <button onClick={() => switchMode('sign_in')} className="text-xs text-muted hover:text-accent transition text-center">
              Déjà un compte ? Se connecter
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Email</span>
              <input
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleForgot)}
                placeholder="toi@exemple.com"
                className={inputClass}
                autoComplete="email"
              />
            </label>
            <button
              onClick={handleForgot}
              disabled={loading || !forgotEmail.trim()}
              className="w-full bg-inkd hover:bg-inkdh active:scale-[0.98] disabled:bg-line disabled:text-disabled text-white font-semibold rounded-xl px-4 py-3 transition text-sm"
            >
              {loading ? 'Envoi...' : 'Envoyer les instructions'}
            </button>
            <button onClick={() => switchMode('sign_in')} className="text-xs text-muted hover:text-accent transition text-center">
              Retour à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
