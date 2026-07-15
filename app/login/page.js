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
    <div className="min-h-screen bg-[#f4f1f9] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-[#e7e2f3] rounded-2xl p-8 shadow-xl shadow-[#2b2438]/5">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif italic text-[#2b2438]">
            Flip<span className="not-italic font-sans font-bold text-[#7c6fe0]">Track</span>
          </h1>
          <p className="text-[#948da8] mt-2">
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
                  brand: '#7c6fe0',
                  brandAccent: '#6c5dd3',
                  brandButtonText: '#ffffff',
                  defaultButtonBackground: '#ffffff',
                  defaultButtonBackgroundHover: '#f4f1f9',
                  defaultButtonBorder: '#e7e2f3',
                  defaultButtonText: '#2b2438',
                  inputBackground: '#ffffff',
                  inputBorder: '#e7e2f3',
                  inputBorderHover: '#c9c0e6',
                  inputBorderFocus: '#7c6fe0',
                  inputText: '#2b2438',
                  inputLabelText: '#948da8',
                  inputPlaceholder: '#b8b2c9',
                  messageText: '#948da8',
                  messageTextDanger: '#c14f4a',
                  anchorTextColor: '#948da8',
                  anchorTextHoverColor: '#7c6fe0',
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
