import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// En-têtes de sécurité appliqués à toutes les réponses (défense en profondeur)
const securityHeaders = [
  // Empêche l'app d'être intégrée dans une iframe tierce (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  // Empêche le navigateur de "deviner" un type MIME (attaques par upload)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Ne fuit pas l'URL complète (qui peut contenir des infos) vers les sites externes
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Coupe l'accès aux capteurs sensibles par défaut (la caméra reste utilisable via getUserMedia same-origin)
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), payment=()' },
  // Force le HTTPS pendant 2 ans (le trafic est déjà en HTTPS via Vercel)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
