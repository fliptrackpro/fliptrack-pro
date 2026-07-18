import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import ChatWidget from "@/components/ChatWidget";
import PageTransition from "@/components/PageTransition";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Alternative gratuite au style proche de Canicule Display (display-serif élégant, flexible, moderne)
const fraunces = Fraunces({
  variable: "--font-serif",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://fliptrack-pro-9ziq.vercel.app"),
  title: {
    default: "FlipTrack — Gère ton activité d'achat-revente",
    template: "%s · FlipTrack",
  },
  description:
    "Suis ton stock, tes ventes et ta marge. Estimation de prix par IA depuis une photo, génération d'annonces Vinted/Leboncoin/eBay, suivi des annonces et des expéditions.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "FlipTrack — Gère ton activité d'achat-revente",
    description:
      "Stock, ventes, marge, annonces générées par IA : l'outil des revendeurs d'occasion.",
    url: "/",
    siteName: "FlipTrack",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "FlipTrack" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ec" },
    { media: "(prefers-color-scheme: dark)", color: "#17141b" },
  ],
};

// Applique le thème avant le premier rendu pour éviter tout flash de couleur.
const themeInit = `(function(){try{var t=localStorage.getItem('fliptrack-theme');if(!t||t==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${fraunces.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <ToastProvider>
          <PageTransition>{children}</PageTransition>
          <ChatWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
