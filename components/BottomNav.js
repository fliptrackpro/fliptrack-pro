'use client'

import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardIcon, BoxIcon, PlusIcon, WalletIcon, LogoutIcon, UserIcon, TruckIcon } from '@/components/icons'
import Logo from '@/components/Logo'

export default function Nav() {
  const router = useRouter()
  const path = usePathname()

  // Sidebar desktop : toutes les destinations (place verticale suffisante)
  const links = [
    { href: '/dashboard', Icon: DashboardIcon, label: 'Dashboard' },
    { href: '/products', Icon: BoxIcon, label: 'Stock' },
    { href: '/products/new', Icon: PlusIcon, label: 'Ajouter' },
    { href: '/commandes', Icon: TruckIcon, label: 'Commandes' },
    { href: '/sales', Icon: WalletIcon, label: 'Ventes' },
    { href: '/account', Icon: UserIcon, label: 'Compte' },
  ]

  // Barre mobile : 4 destinations + bouton "+" central proéminent (Commandes reste
  // accessible depuis le dashboard et la sidebar). Évite une barre à 6 onglets illisible.
  const mobileLeft = [
    { href: '/dashboard', Icon: DashboardIcon, label: 'Accueil' },
    { href: '/products', Icon: BoxIcon, label: 'Stock' },
  ]
  const mobileRight = [
    { href: '/sales', Icon: WalletIcon, label: 'Ventes' },
    { href: '/account', Icon: UserIcon, label: 'Compte' },
  ]
  const mobileTab = (l) => (
    <button
      key={l.href}
      onClick={() => router.push(l.href)}
      className={`flex flex-col items-center gap-1 flex-1 py-1 rounded-xl transition
        ${path === l.href ? 'text-accent' : 'text-muted'}`}
    >
      <l.Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{l.label}</span>
    </button>
  )

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

      {/* Barre mobile bas : 4 onglets + bouton "+" central surélevé */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-surface border-t border-line flex items-end justify-around px-2 py-2.5">
        {mobileLeft.map(mobileTab)}
        <button
          onClick={() => router.push('/products/new')}
          aria-label="Ajouter un produit"
          className="flex-shrink-0 -mt-6 w-14 h-14 rounded-full bg-inkd hover:bg-inkdh active:scale-95 text-white shadow-lg shadow-inkd/30 flex items-center justify-center transition"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
        {mobileRight.map(mobileTab)}
      </nav>
    </>
  )
}
