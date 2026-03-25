# Next Whois UI (X.RW)

A fast and modern WHOIS/RDAP lookup tool built with Next.js 14.

## Features
- RDAP-first lookup with fallback to traditional WHOIS (TCP/HTTP)
- Domain metrics and scoring
- Monitoring and expiration reminders
- Admin dashboard
- Multi-protocol support (WHOIS TCP port 43, HTTP scrapers, RDAP)
- Multi-language support (EN, ZH, ZH-TW, DE, RU, JA, FR, KO)
- PWA support

## Tech Stack
- **Framework**: Next.js 14 (Pages Router), React 18
- **Styling**: Tailwind CSS, Shadcn UI (Radix UI), Framer Motion
- **Database**: PostgreSQL (`pg`), Redis caching (`ioredis`)
- **Auth**: next-auth
- **Payments**: Stripe
- **WHOIS/RDAP**: whoiser, node-rdap, tldts
- **i18n**: i18next, next-i18next

## Project Structure
- `src/pages/` - Next.js routes (Pages Router)
  - `api/` - Backend serverless API endpoints
  - `admin/` - Admin dashboard pages
- `src/lib/` - Core logic
  - `whois/` - WHOIS/RDAP lookup engine
  - `db.ts` / `db-query.ts` - PostgreSQL connection and migrations
  - `server/` - Redis caching, rate limiting
- `src/components/` - UI components
- `locales/` - i18n translation files
- `public/` - Static assets

## Environment Variables
- `POSTGRES_URL` - PostgreSQL connection string (required for DB features)
- `REDIS_HOST` - Redis host (optional, for caching)
- `NEXTAUTH_SECRET` - Secret for next-auth sessions
- `NEXTAUTH_URL` - Base URL for next-auth
- `STRIPE_SECRET_KEY` - Stripe secret key (optional, for payments)

## Running
- Dev server: `npm run dev` (port 5000)
- Build: `npm run build`
- Start: `npm run start`
