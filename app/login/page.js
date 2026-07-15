'use client'

import { supabase } from '@/lib/supabase'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8 shadow-2xl">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Flip<span className="text-emerald-400">Track</span>
          </h1>
          <p className="text-gray-400 mt-2">
            Gérez vos achats et ventes en un clic
          </p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#34d399',
                  brandAccent: '#10b981',
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
            },
          }}
        />
      </div>
    </div>
  )
}