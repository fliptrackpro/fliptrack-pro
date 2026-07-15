'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push('/dashboard')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') router.push('/dashboard')
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#161920] border border-white/5 rounded-2xl p-8 shadow-2xl">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Flip<span className="text-indigo-400">Track</span>
          </h1>
          <p className="text-gray-400 mt-2">
            Gérez vos achats et ventes en un clic
          </p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#818cf8',
                  brandAccent: '#6366f1',
                  brandButtonText: '#ffffff',
                  defaultButtonBackground: '#161920',
                  defaultButtonBackgroundHover: '#1e222b',
                  defaultButtonBorder: 'rgba(255,255,255,0.1)',
                  defaultButtonText: '#ffffff',
                  inputBackground: '#0d0f14',
                  inputBorder: 'rgba(255,255,255,0.1)',
                  inputBorderHover: 'rgba(255,255,255,0.25)',
                  inputBorderFocus: '#818cf8',
                  inputText: '#ffffff',
                  inputLabelText: '#9ca3af',
                  inputPlaceholder: '#6b7280',
                  messageText: '#9ca3af',
                  messageTextDanger: '#f87171',
                  anchorTextColor: '#9ca3af',
                  anchorTextHoverColor: '#ffffff',
                }
              }
            }
          }}
          providers={[]}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email',
                password_label: 'Mot de passe',
                button_label: 'Se connecter',
                link_text: 'Déjà un compte ? Se connecter',
              },
              sign_up: {
                email_label: 'Email',
                password_label: 'Mot de passe',
                button_label: "S'inscrire",
                link_text: "Pas de compte ? S'inscrire",
              },
              forgotten_password: {
                email_label: 'Email',
                button_label: 'Envoyer les instructions',
                link_text: 'Mot de passe oublié ?',
              },
            },
          }}
        />
      </div>
    </div>
  )
}
