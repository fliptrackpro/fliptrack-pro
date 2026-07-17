'use client'

import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardIcon, BoxIcon, PlusIcon, WalletIcon, LogoutIcon, UserIcon, TruckIcon } from '@/components/icons'
import Logo from '@/components/Logo'

export default function Nav() {
  const router = useRouter()
  const path = usePathname()

  const links = [
    { href: '/dashboard', Icon: DashboardIcon, label: 'Dashboard' },
    { href: '/products', Icon: BoxIcon, label: 'Stock' },
    { href: '/products/new', Icon: PlusIcon, label: 'Ajouter' },
    { href: '/commandes', Icon: TruckIcon, label: 'Commandes' },
    { href: '/sales', Icon: WalletIcon, label: 'Ventes' },
    { href: '/account', Icon: UserIcon, label: 'Compte' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Sidebar PC */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-surface border-r border-line z-20">
        <div className="px-5 py-6 mb-2">
          <Logo markClass="w-7 h-7" textClass="text-lg" />
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {links.map(l => (
            <button
              key={l.href}
              onClick={() => router.push(l.href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition text-left
                ${path === l.href
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:bg-accent/5 hover:text-ink'
                }`}
            >
              <l.Icon className="w-[18px] h-[18px]" />
              <span>{l.label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-auto mx-3 mb-5 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-coral/10 hover:text-coral transition text-left"
        >
          <LogoutIcon className="w-[18px] h-[18px]" />
          <span>Déconnexion</span>
        </button>
      </aside>

      {/* Barre mobile bas */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-line flex items-center justify-around px-0.5 py-2.5">
        {links.map(l => (
          <button
            key={l.href}
            onClick={() => router.push(l.href)}
            className={`flex flex-col items-center gap-1 px-1 py-1 rounded-xl transition
              ${path === l.href ? 'text-accent' : 'text-muted'}`}
          >
            <l.Icon className="w-5 h-5" />
            <span className="text-[9px] font-medium">{l.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
