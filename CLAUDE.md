# FlipTrack Pro

Application de suivi d'achat/revente ("flip") d'articles d'occasion : stock, ventes, marge, génération d'annonces IA, assistant de vente. Interface en français. Objectif à terme : SaaS multi-utilisateurs.

## Stack

- **Next.js 16 (App Router, Turbopack)** — JavaScript, pas de TypeScript
- **Supabase** — auth (email/mdp), Postgres avec RLS par `user_id`, Storage (bucket public `products` pour les photos)
- **Google Gemini** (`gemini-flash-lite-latest`, tier gratuit) — estimation prix depuis photo, génération d'annonces, chatbot-agent "Flip"
- **Tailwind CSS v3** — config `tailwind.config.js`, PostCSS via `postcss.config.mjs` (ne PAS recréer de `postcss.config.js`, ça casse le build)
- **Vercel** — déploiement auto à chaque push sur `main` → https://fliptrack-pro-9ziq.vercel.app
- **PWA** — `public/manifest.json` + icônes générées ; viewport défini dans `app/layout.js`

## Commandes

- `npm run dev` — serveur de dev sur :3000 (préférer `.claude/launch.json` / preview_start)
- `npm run build` — build de prod, à lancer avant chaque push pour vérifier
- `npm run lint` — eslint

## Variables d'environnement (`.env.local`, jamais commité)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — projet Supabase `nbfsciusnxdnxvrlxiwo`
- `GEMINI_API_KEY` — clé API Gemini (serveur uniquement)
- `DAILY_AI_LIMIT` (optionnel, défaut 100) — plafond d'appels IA par utilisateur/jour

Les mêmes variables doivent exister dans les settings Vercel.

## Architecture

- `app/login` — Supabase Auth UI ; redirige vers `/dashboard` si connecté
- `app/dashboard` — KPIs (carte héro marge + sparkline 7j), meilleures catégories, stock récent, "à reposter", stock qui stagne
- `app/products` — liste stock/vendus, recherche, filtres, boutons Modifier/Publier/Vendre/Supprimer
- `app/products/new` — ajout produit : photo → estimation IA (préremplit nom/catégorie/état + fourchette prix sauvegardée), scanner code-barres (BarcodeDetector natif + UPCItemDB)
- `app/products/[id]/edit|sell|publish` — édition, vente (frais plateforme pré-remplis par taux), génération d'annonces 5 plateformes avec hashtags (Vinted/Facebook) + suivi de repost
- `app/sales` — historique, marge par vente, annulation de vente (retour en stock), export CSV
- `app/account` — changement de mot de passe, suppression de toutes les données
- `app/api/estimate|listing|chat|barcode` — routes serveur ; toutes exigent un Bearer token Supabase (`lib/apiAuth.js:requireUser`), les routes Gemini passent par `checkAiQuota`
- `components/ChatWidget.js` — chatbot-agent "Flip" flottant (function calling : générer annonce, marquer reposté), historique en localStorage
- `lib/margin.js` — calcul de marge + résumé de contexte pour le chat
- `lib/listingGenerator.js` — génération d'annonces partagée (validation SSRF de `photo_url` incluse)

## Base de données

Schéma complet dans `supabase/schema.sql` ; migrations incrémentales dans `supabase/migration_00X_*.sql`. **Les migrations doivent être exécutées à la main dans le SQL Editor Supabase** (pas de CLI configurée). Après toute modification de schéma : mettre à jour `schema.sql` ET créer une migration.

Tables : `products` (avec `photo_url`, `estimated_price_min/max`, `last_reposted_at`), `sales`, `ai_usage` (quota IA/jour). RLS activée partout, scope `auth.uid() = user_id`. Bucket Storage `products` : lecture publique, écriture limitée au dossier de l'utilisateur.

## Conventions et pièges

- Palette "Dashboard Beau" : fond `#f5f2ec`, encre `#241f2e`, accent violet `#6d5ce6`, vert argent `#4a8a6f`, corail alertes `#e0654a`. Couleurs en dur dans les classes Tailwind (pas de tokens).
- Les réponses IA doivent être en texte brut (pas de markdown) — c'est imposé dans les prompts.
- Gemini function calling : renvoyer le part complet avec `thoughtSignature` dans l'historique, sinon erreur 400.
- Modèle Gemini : seul `gemini-flash-lite-latest` a du quota sur le tier gratuit de cette clé.
- En dev sur cette machine : un `package-lock.json` parasite dans `C:\Users\Aldorne.mve2\` impose `turbopack.root` dans `next.config.mjs` (déjà configuré).
- Erreurs d'hydratation `<MetadataWrapper>` dans la console dev : artefact connu du mode dev Next 16, pas un bug de l'app.
