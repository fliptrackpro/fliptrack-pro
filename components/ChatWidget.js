'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

function ChatIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

const PLATFORM_LABELS = {
  vinted: 'Vinted',
  leboncoin: 'Leboncoin',
  facebook: 'Facebook Marketplace',
  ebay: 'eBay',
  vestiaire: 'Vestiaire Collective',
}

function ListingActionCard({ action }) {
  const [copiedKey, setCopiedKey] = useState('')

  const copy = (key, text) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(''), 1500)
  }

  return (
    <div className="self-start max-w-[92%] bg-white border border-[#eae5f0] rounded-2xl p-3 flex flex-col gap-2">
      <p className="text-xs font-semibold text-[#6d5ce6]">Annonce générée · {action.product_name}</p>
      {Object.entries(action.listings || {}).map(([key, listing]) => (
        <div key={key} className="bg-[#f5f2ec] rounded-xl p-2.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-semibold text-[#8b8496] uppercase tracking-wide">{PLATFORM_LABELS[key] || key}</span>
            <button
              onClick={() => copy(key, `${listing.title}\n\n${listing.description}`)}
              className="text-[10px] bg-white hover:bg-[#e5e0f7] text-[#655e72] font-medium px-2 py-0.5 rounded-full transition"
            >
              {copiedKey === key ? '✓ Copié' : 'Copier'}
            </button>
          </div>
          <p className="text-xs font-semibold text-[#241f2e]">{listing.title}</p>
          <p className="text-xs text-[#655e72] mt-0.5">{listing.description}</p>
        </div>
      ))}
    </div>
  )
}

export default function ChatWidget() {
  const [user, setUser] = useState(null)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Restaure l'historique du chat propre à l'utilisateur connecté
  useEffect(() => {
    if (!user) return
    try {
      const saved = localStorage.getItem(`fliptrack-chat-${user.id}`)
      if (saved) setMessages(JSON.parse(saved))
    } catch {
      // historique illisible, on repart de zéro
    }
  }, [user?.id])

  useEffect(() => {
    if (!user || messages.length === 0) return
    try {
      localStorage.setItem(`fliptrack-chat-${user.id}`, JSON.stringify(messages.slice(-40)))
    } catch {
      // stockage plein ou indisponible, tant pis
    }
  }, [messages, user?.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  if (!user) return null

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setSending(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages(m => [...m, { role: 'assistant', content: data.error || "Erreur, réessaie." }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: data.reply, action: data.action }])
      }
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erreur : ' + err.message }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-40 md:bottom-24 right-4 md:right-6 z-40 w-[calc(100%-2rem)] max-w-sm h-[55dvh] max-h-[480px] bg-white rounded-2xl shadow-2xl shadow-[#241f2e]/20 flex flex-col overflow-hidden animate-rise-in">
          <div className="bg-[#241f2e] px-4 py-3.5 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-sm font-semibold text-white">Flip</p>
              <p className="text-[11px] text-white/60">Ton assistant vente</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    setMessages([])
                    try { localStorage.removeItem(`fliptrack-chat-${user.id}`) } catch {}
                  }}
                  className="text-white/70 hover:text-white text-[11px] px-2 py-1 rounded-lg hover:bg-white/10 transition"
                >
                  Effacer
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition">
                ✕
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-[#8b8496]">Pose-moi une question sur la vente de tes articles.</p>
                <div className="flex flex-col gap-1.5 mt-3">
                  {['Comment fixer le bon prix ?', 'Un article ne se vend pas, que faire ?', 'Comment négocier avec un acheteur ?'].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-xs text-left bg-[#f5f2ec] hover:bg-[#efebfd] text-[#655e72] px-3 py-2 rounded-xl transition"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
                  m.role === 'user'
                    ? 'self-end bg-[#6d5ce6] text-white rounded-br-md'
                    : 'self-start bg-[#f5f2ec] text-[#241f2e] rounded-bl-md'
                }`}>
                  {m.content}
                </div>
                {m.action?.type === 'generate_listing' && <ListingActionCard action={m.action} />}
              </div>
            ))}
            {sending && (
              <div className="self-start bg-[#f5f2ec] px-3.5 py-2.5 rounded-2xl rounded-bl-md flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#b3aebf] animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#b3aebf] animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#b3aebf] animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[#eae5f0] flex items-center gap-2 flex-shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écris ta question..."
              className="flex-1 bg-[#f5f2ec] border border-transparent focus:border-[#6d5ce6] rounded-xl px-3.5 py-2.5 text-sm text-[#241f2e] placeholder-[#b3aebf] focus:outline-none transition"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="w-9 h-9 flex-shrink-0 bg-[#241f2e] disabled:bg-[#eae5f0] rounded-xl flex items-center justify-center text-white transition"
            >
              →
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 w-14 h-14 rounded-full bg-[#6d5ce6] hover:bg-[#5d4dd6] text-white shadow-lg shadow-[#6d5ce6]/30 flex items-center justify-center transition active:scale-95"
        aria-label="Flip, assistant vente"
      >
        {open ? '✕' : <ChatIcon className="w-6 h-6" />}
      </button>
    </>
  )
}
