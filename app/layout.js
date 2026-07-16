import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import ChatWidget from "@/components/ChatWidget";

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
  themeColor: "#f5f2ec",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body
        className={`${jakarta.variable} ${fraunces.variable} antialiased`}
      >
        <ToastProvider>
          {children}
          <ChatWidget />
        </ToastProvider>
      </body>
    </html>
  );
}
