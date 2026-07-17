// Logo FlipTrack : badge violet dégradé avec flèche de tendance (la marge qui monte)
export function LogoMark(props) {
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <linearGradient id="ft-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d5ce6" />
          <stop offset="1" stopColor="#a893f5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#ft-grad)" />
      <path
        d="M16.5 42 L27 30.5 L33.5 36.5 L47.5 21.5"
        stroke="#ffffff"
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M38 20.5 L48 20.5 L48 30.5"
        stroke="#ffffff"
        strokeWidth="5.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Logo({ className = '', markClass = 'w-8 h-8', textClass = 'text-lg' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={`${markClass} rounded-[28%] shadow-sm shadow-accent/30 flex-shrink-0`} />
      <span className={`font-serif italic text-ink leading-none ${textClass}`}>
        Flip<span className="not-italic font-sans font-bold text-accent">Track</span>
      </span>
    </span>
  )
}
