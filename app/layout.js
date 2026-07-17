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
  title: "FlipTrack",
  description: "Gérez vos achats et ventes en un clic",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
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
