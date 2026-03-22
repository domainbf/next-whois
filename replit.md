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
- `src/lib/lifecycle.ts` — Shared TLD lifecycle table (65+ gTLD/ccTLD); used by both frontend and backend for grace/redemption/pendingDelete period computation
- `src/pages/api/remind/submit.ts` — Subscription submission API
- `src/pages/api/remind/process.ts` — Cron processor that fires pre-expiry AND phase-event reminders
- `src/lib/email.ts` — All email templates (welcome, subscription confirm, pre-expiry reminder, phase event)

## Architecture

The lookup flow: API request → try RDAP → fallback to WHOIS → merge results → if still empty try yisi.yun fallback → cache in Redis → return to client.

### Lookup fallback chain

1. **RDAP** (`node-rdap` + bootstrap) — primary, returns structured JSON
2. **WHOIS** (`whoiser` + custom servers) — secondary, raw text parsed by `common_parser.ts`
3. **yisi.yun API** (`src/lib/whois/yisi-fallback.ts`) — tertiary; only invoked when both RDAP and WHOIS fail or return empty/error data for a domain query. Supports unusual TLDs with no public RDAP/WHOIS server. Zero overhead when native lookups succeed.

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

### ScraperEntry type (2026-03)

Added `{ type: "scraper", name, registryUrl }` entry type for TLDs that require multi-step HTTP scraping (e.g. CSRF tokens + cookies):
- **`src/lib/whois/http-scrapers/nic-ba.ts`** — Dedicated scraper for .ba (Bosnia) via nic.ba. Performs GET+POST form submission; fails gracefully when reCAPTCHA v2 blocks automated access.
- **`ScraperRequiredError`** — Custom error class in `lookup.ts` that carries `registryUrl` for propagation to the API response.
- **`WhoisResult.registryUrl`** — New optional field on `WhoisResult` type passed through to the API `Data` type.
- **Frontend** — Shows "Look up at Registry" button (with external-link icon) in both the "registered but no WHOIS" panel and the generic error fallback panel whenever `registryUrl` is present.
- **`.ba` fix** — Removed wrong `"ba": "whois.ripe.net"` mapping from `cctld-whois-servers.json` (set to `null`). Now .ba domains correctly show DNS-probe–based registration status + registry link.
- **Null filter** — `getAllCustomServers()` now filters out null values from cctld-whois-servers.json so BUILTIN_SERVERS entries can take precedence.

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
- `src/pages/api/stamp/verify.ts` — DNS TXT + HTTP file verification (multi-resolver, DoH fallback, fuzzy match)
- `src/pages/api/vercel/add-domain.ts` — Register domain with Vercel project; returns `_vercel` TXT record for ownership proof
- `src/pages/api/vercel/check-domain.ts` — Poll Vercel verify endpoint; updates stamp as verified if DNS propagated
- `src/pages/api/remind/submit.ts` — Subscribe to domain expiry reminders
- `src/pages/api/remind/cancel.ts` — Cancel a subscription via cancel token (returns JSON)
- `src/pages/api/remind/process.ts` — Cron job: sends reminder emails via Resend, marks sent records

### Libraries
- `src/lib/supabase.ts` — Supabase JS client singleton (REST-based, works from any network)
- `src/lib/db.ts` — Retained for pg Pool schema definitions (TABLES array); pg Pool only used on Vercel where TCP is allowed
- `src/lib/rate-limit.ts` — In-memory IP rate limiter (5 req/min per IP, auto-cleanup)

### Database Architecture
All API routes use `@supabase/supabase-js` (HTTP/REST) via `src/lib/supabase.ts`.
This allows the app to connect to Supabase from **any network** (Replit dev, Vercel production) 
without requiring direct TCP access to PostgreSQL port 5432/6543.

Required Supabase tables — **created automatically by `scripts/migrate.js` on each Vercel build**:
- `users` — user accounts for auth
- `password_reset_tokens` — password reset tokens (60-min expiry, single-use)
- `stamps` — brand claiming records
- `reminders` — domain expiry reminder subscriptions
- `reminder_logs` — tracking which reminder thresholds have been sent
- `tool_clicks` — global aggregate click counts per tool URL
- `user_tool_clicks` — per-user click counts for personalized sorting
- `search_history` — per-user search history (last 50 queries)

### Environment Variables Required
| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (from project Settings → API) |
| `NEXTAUTH_SECRET` | Yes | Random secret for NextAuth JWT signing |
| `RESEND_API_KEY` | Yes | Resend API key for sending reminder/reset emails |
| `RESEND_FROM_EMAIL` | No | Sender address for emails (defaults to `noreply@x.rw`) |
| `NEXT_PUBLIC_BASE_URL` | Yes | Public URL for cancel/reset links in emails |
| `CRON_SECRET` | Recommended | Secret token to protect `POST /api/remind/process` |
| `VERCEL_API_TOKEN` | Yes (Vercel verify) | Vercel API token for domain verification |
| `VERCEL_PROJECT_ID` | Yes (Vercel verify) | Vercel project ID (`prj_...`) |
| `POSTGRES_URL_NON_POOLING` | Vercel only | Direct Supabase connection for pg Pool migrations |

### Cron Setup
To trigger reminder emails automatically, set up a cron job (e.g. daily) to call:
```
GET /api/remind/process?secret=<CRON_SECRET>
```
Or with a header:
```
GET /api/remind/process
x-cron-secret: <CRON_SECRET>
```

## Dev Server

Runs on port 5000 via `pnpm run dev` (next dev -p 5000 -H 0.0.0.0).
