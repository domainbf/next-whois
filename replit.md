# Next Whois UI

A fast, modern WHOIS and RDAP lookup tool supporting domains, IPv4/IPv6, ASN, and CIDR.

## Tech Stack

- **Framework**: Next.js 14 (Pages Router)
- **Styling**: Tailwind CSS + Shadcn UI + Framer Motion
- **WHOIS**: whoiser library + node-rdap for RDAP queries
- **Caching**: ioredis (Redis)
- **i18n**: next-i18next (EN, ZH, DE, RU, JA, FR, KO)
- **Fonts**: Geist

## Key Files

- `src/lib/whois/lookup.ts` — WHOIS/RDAP orchestration, caching, error detection
- `src/lib/whois/common_parser.ts` — Raw WHOIS text parser, field extraction, data cleaning
- `src/lib/whois/epp_status.ts` — EPP status code mapping with Chinese translations
- `src/lib/whois/rdap_client.ts` — RDAP query client
- `src/pages/api/lookup.ts` — API endpoint
- `src/pages/[...query].tsx` — Result display page

## Architecture

The lookup flow: API request → try RDAP → fallback to WHOIS → merge results → cache in Redis → return to client.

## Data Cleaning Enhancements (2026-03)

Enhanced `common_parser.ts` with:
- **HTML entity decoding**: Handles ccTLD WHOIS servers that return HTML entities in field values (e.g., `Activ&eacute;` → `Activé`)
- **Dot-pattern cleaning**: Strips leading dot sequences used by some ccTLD WHOIS servers as privacy redaction markers (e.g., `............value` → `value`)
- **Redacted value filtering**: Skips contact fields (email, phone, org, country) that are privacy-redacted (high dot ratio, REDACTED/WITHHELD keywords)
- **Universal field cleaning**: Applied to all parsed values via `cleanFieldValue()`

Enhanced `epp_status.ts` with:
- **Expanded status map**: 50+ status codes covering standard EPP + ccTLD-specific variants
- **Multi-language status support**: French (Activé, Enregistré, Supprimé, Expiré), German (registriert, aktiv, gesperrt, gelöscht), Spanish/Portuguese (registrado, activo, ativo), Dutch (actief, geregistreerd), Italian (registrato), Turkish (kaydedildi), etc.
- **Robust normalization**: Two-pass lookup — first tries with accented characters preserved, then falls back to ASCII-folded form
- **New categories**: Added `unknown` category for unregistered/available status codes
- **More EPP statuses**: quarantine, dispute, abuse, withheld, pendingPurge, verificationFailed, courtOrder, etc.

## Custom WHOIS Server Management (2026-03)

Added local WHOIS server management without touching rdap/whoiser libraries:

- **`src/lib/whois/custom-servers.ts`** — Extended server entry types:
  - `string` → TCP hostname (legacy, port 43)
  - `{ type: "tcp", host, port? }` → TCP with optional custom port
  - `{ type: "http", url, method?, body? }` → HTTP GET/POST with `{{domain}}` placeholder
- **`src/lib/whois/lookup.ts`** — Added:
  - `queryWhoisTcp()` — raw Node.js `net` TCP connection for non-43 ports
  - `queryWhoisHttp()` — fetch-based HTTP WHOIS query with URL template substitution
  - Updated `getLookupWhois()` to dispatch based on entry type
- **`src/pages/api/whois-servers.ts`** — GET/POST/DELETE API for managing custom servers (no auth required)
- **`src/pages/whois-servers.tsx`** — Full UI management page accessible via navbar "Servers" link
- **`src/data/custom-tld-servers.json`** — User-editable server map (persisted on disk)

Priority order: user custom servers → built-in servers → ccTLD servers → whoiser default discovery.

## Vercel / Edge Platform Deployment

The app is production-ready for Vercel and similar serverless platforms.

### Key configuration files:
- **`vercel.json`** — Function maxDuration per route (30s for lookup, 10s for others)
- **`.env.example`** — All required environment variables documented

### Environment variables for production:
| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_URL` | Yes* | — | Redis connection URL (Upstash/Vercel KV/Railway) |
| `REDIS_HOST` | Yes* | — | Alternative to REDIS_URL for self-hosted Redis |
| `WHOIS_TIMEOUT_MS` | No | 10000 | WHOIS query timeout in ms (keep ≤ 8000 on Hobby plan) |
| `REDIS_CACHE_TTL` | No | 3600 | Result cache TTL in seconds |
| `NEXT_PUBLIC_MAX_WHOIS_FOLLOW` | No | 0 | WHOIS follow depth (0 = fastest) |
| `ADMIN_SECRET` | No | — | Protects /api/admin/tld-servers |

*One of REDIS_URL or REDIS_HOST is required to persist custom WHOIS servers across serverless function instances.

### Redis storage:
- Lookup results cached at key `whois:{query}` with TTL from `REDIS_CACHE_TTL`
- User-managed custom WHOIS servers stored at key `whois:user-servers` (no TTL — persistent)
- Without Redis, custom servers fall back to `src/data/custom-tld-servers.json` (local only)

### Vercel plan considerations:
- **Hobby plan (10s limit)**: Set `WHOIS_TIMEOUT_MS=7000`. Some slow registries may still timeout.
- **Pro plan (300s limit)**: Default 10s is fine; increase to 15000 for best coverage.

## Brand Claim (品牌认领) & Domain Subscription (域名订阅)

### New Pages
- `src/pages/stamp.tsx` — Brand Claim page with DNS TXT ownership verification (3-step flow: form → verify → done)
- `src/pages/remind/cancel.tsx` — Subscription cancellation page (reads `?token=` param, calls cancel API)

### New API Routes
- `src/pages/api/stamp/submit.ts` — Submit a stamp claim; returns `txtRecord` and `txtValue` for DNS TXT verification
- `src/pages/api/stamp/check.ts` — Query verified stamps for a domain
- `src/pages/api/remind/submit.ts` — Subscribe to domain expiry reminders
- `src/pages/api/remind/cancel.ts` — Cancel a subscription via cancel token (returns JSON)
- `src/pages/api/remind/process.ts` — Cron job: sends reminder emails via Resend, marks sent records

### Libraries
- `src/lib/db.ts` — PostgreSQL connection pool (max:5, timeouts, error listener)
- `src/lib/rate-limit.ts` — In-memory IP rate limiter (5 req/min per IP, auto-cleanup)

### Environment Variables Required
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Replit PostgreSQL connection string |
| `RESEND_API_KEY` | Yes | Resend API key for sending reminder emails |
| `RESEND_FROM_EMAIL` | Yes | Sender address for emails (e.g. `reminders@yourdomain.com`) |
| `NEXT_PUBLIC_BASE_URL` | Yes | Public URL for cancel links in emails (e.g. `https://yourapp.replit.app`) |
| `CRON_SECRET` | Recommended | Secret token to protect `POST /api/remind/process` from unauthorized calls |

### Cron Setup
To trigger reminder emails automatically, set up a cron job (e.g. daily) to call:
```
POST /api/remind/process
Authorization: Bearer <CRON_SECRET>
```

## Dev Server

Runs on port 5000 via `pnpm run dev` (next dev -p 5000 -H 0.0.0.0).
