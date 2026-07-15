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
    <div className="min-h-screen bg-[#f5f2ec] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#eae5f0] rounded-2xl p-8 shadow-xl shadow-[#241f2e]/5">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif italic text-[#241f2e]">
            Flip<span className="not-italic font-sans font-bold text-[#6d5ce6]">Track</span>
          </h1>
          <p className="text-[#8b8496] mt-2">
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
                  brand: '#6d5ce6',
                  brandAccent: '#5d4dd6',
                  brandButtonText: '#ffffff',
                  defaultButtonBackground: '#ffffff',
                  defaultButtonBackgroundHover: '#f5f2ec',
                  defaultButtonBorder: '#eae5f0',
                  defaultButtonText: '#241f2e',
                  inputBackground: '#ffffff',
                  inputBorder: '#eae5f0',
                  inputBorderHover: '#c3bcf0',
                  inputBorderFocus: '#6d5ce6',
                  inputText: '#241f2e',
                  inputLabelText: '#8b8496',
                  inputPlaceholder: '#b3aebf',
                  messageText: '#8b8496',
                  messageTextDanger: '#e0654a',
                  anchorTextColor: '#8b8496',
                  anchorTextHoverColor: '#6d5ce6',
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
