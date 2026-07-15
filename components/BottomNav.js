'use client'

import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardIcon, BoxIcon, PlusIcon, WalletIcon, LogoutIcon } from '@/components/icons'

export default function Nav() {
  const router = useRouter()
  const path = usePathname()

  const links = [
    { href: '/dashboard', Icon: DashboardIcon, label: 'Dashboard' },
    { href: '/products', Icon: BoxIcon, label: 'Stock' },
    { href: '/products/new', Icon: PlusIcon, label: 'Ajouter' },
    { href: '/sales', Icon: WalletIcon, label: 'Ventes' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Sidebar PC */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-[#111318] border-r border-white/5 z-20">
        <div className="px-5 py-6 mb-2">
          <span className="text-lg font-bold text-white">
            Flip<span className="text-indigo-400">Track</span>
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {links.map(l => (
            <button
              key={l.href}
              onClick={() => router.push(l.href)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition text-left
                ${path === l.href
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              <l.Icon className="w-[18px] h-[18px]" />
              <span>{l.label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-auto mx-3 mb-5 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition text-left"
        >
          <LogoutIcon className="w-[18px] h-[18px]" />
          <span>Déconnexion</span>
        </button>
      </aside>

      {/* Barre mobile bas */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#111318] border-t border-white/5 flex items-center justify-around px-2 py-2.5">
        {links.map(l => (
          <button
            key={l.href}
            onClick={() => router.push(l.href)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition
              ${path === l.href ? 'text-indigo-400' : 'text-gray-500'}`}
          >
            <l.Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{l.label}</span>
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition text-gray-500"
        >
          <LogoutIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium">Sortir</span>
        </button>
      </nav>
    </>
  )
}
