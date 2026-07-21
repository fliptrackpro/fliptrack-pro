/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      colors: {
        // Palette "Dashboard Beau" pilotée par variables CSS (mode clair/sombre).
        // Les valeurs claires sont identiques à l'ancienne palette en dur.
        accent: 'rgb(var(--accent) / <alpha-value>)',
        accenth: 'rgb(var(--accenth) / <alpha-value>)',
        accent2: 'rgb(var(--accent2) / <alpha-value>)',
        accent3: 'rgb(var(--accent3) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        inkd: 'rgb(var(--inkd) / <alpha-value>)',
        inkdh: 'rgb(var(--inkdh) / <alpha-value>)',
        ink2: 'rgb(var(--ink2) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        muted2: 'rgb(var(--muted2) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        disabled: 'rgb(var(--disabled) / <alpha-value>)',
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        line2: 'rgb(var(--line2) / <alpha-value>)',
        sage: 'rgb(var(--sage) / <alpha-value>)',
        sage2: 'rgb(var(--sage2) / <alpha-value>)',
        sageh: 'rgb(var(--sageh) / <alpha-value>)',
        sagebg: 'rgb(var(--sagebg) / <alpha-value>)',
        coral: 'rgb(var(--coral) / <alpha-value>)',
        coralbg: 'rgb(var(--coralbg) / <alpha-value>)',
        // Variantes assombries pour les boutons à fond plein (texte blanc dessus, ≥4.5:1)
        coralbtn: 'rgb(var(--coralbtn) / <alpha-value>)',
        sagebtn: 'rgb(var(--sagebtn) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
        violetbg: 'rgb(var(--violetbg) / <alpha-value>)',
        violetbg2: 'rgb(var(--violetbg2) / <alpha-value>)',
        violetbg3: 'rgb(var(--violetbg3) / <alpha-value>)',
        violetbdr: 'rgb(var(--violetbdr) / <alpha-value>)',
        estim1: 'rgb(var(--estim1) / <alpha-value>)',
        estim2: 'rgb(var(--estim2) / <alpha-value>)',
        estim3: 'rgb(var(--estim3) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
