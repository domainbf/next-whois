# Next Whois UI — v2.0

A fast, modern WHOIS and RDAP lookup tool supporting domains, IPv4/IPv6, ASN, and CIDR. Also includes built-in DNS, SSL certificate, and IP/ASN geolocation tools.

## Recent Changes (v2.0)

- **Page transitions**: Pure opacity (0.15s easeOut), no y-offset jitter
- **DNS tool** (`dns.tsx`): CAA record type added; AnimatePresence for all states; MX priority badges; SOA structured display; 4×DoH resolvers; preset shortcuts (基础解析/邮件安全/域名服务器/证书授权)
- **SSL tool** (`ssl.tsx`): ValidityBar progress component; AnimatePresence for all states; quick examples (google.com/github.com/cloudflare.com); refresh button
- **IP/ASN tool** (`ip.tsx`): AnimatePresence for all states; Yandex static map preview; IPv6 + ASN examples
- **Sponsor page** (`sponsor.tsx`): Full redesign — animated heart hero with floating hearts; Alipay/WeChat QR cards; PayPal button; BTC/ETH/USDT/OKX crypto addresses (CopyButton); "已完成赞助" post-payment form with AnimatePresence; bouncing emoji thank-you section
- **Sponsor submit API** (`/api/sponsors/submit.ts`): Public endpoint — inserts with `is_visible=false` for admin approval
- **Admin settings**: Added PayPal URL + 4 crypto address fields to sponsor section
- **DNS API** (`/api/dns/records.ts`): CAA (type 257) added to RECORD_TYPES, TYPE_NUM, and parseDoHData
- **Docs page** (`docs.tsx`): Three new API sections — `/api/dns/records`, `/api/ssl/cert`, `/api/ip/lookup`

## Tech Stack

- **Framework**: Next.js 14 (Pages Router)
- **Styling**: Tailwind CSS + Shadcn UI + Framer Motion
- **WHOIS**: whoiser library + node-rdap for RDAP queries
- **Caching**: ioredis (Redis)
- **i18n**: next-i18next (EN, ZH, DE, RU, JA, FR, KO)
- **Fonts**: Geist

## Build / Deployment

- **Config**: `next.config.js` (CommonJS, `require`/`module.exports`) — converted from `.mjs` to be compatible with Vercel's `sed`-based build command which patches `next.config.js`
- **TypeScript errors**: `typescript: { ignoreBuildErrors: true }` is pre-applied in the config, so Vercel's sed patch is a harmless no-op
- **Vercel build command**: `sed -i '...' next.config.js && node scripts/migrate.js && pnpm run build`

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
- `src/lib/admin-shared.ts` — Client-safe admin helpers: `ADMIN_EMAIL` constant and `isAdmin()` function
- `src/lib/admin.ts` — Server-only admin middleware: `requireAdmin()` for API route protection
- `src/lib/site-settings.tsx` — Site settings context: `SiteSettingsProvider`, `useSiteSettings()` hook, `DEFAULT_SETTINGS`
- `src/components/admin-layout.tsx` — Shared admin backend layout with sidebar navigation and auth guard
- `src/pages/admin/index.tsx` — Admin dashboard with real-time stats (users, stamps, reminders, searches)
- `src/pages/admin/settings.tsx` — Site settings editor (title, logo, subtitle, description, footer, icon, announcement)
- `src/pages/admin/users.tsx` — User management (search, list, delete)
- `src/pages/admin/stamps.tsx` — Stamp management (search, verify/unverify, delete)
- `src/pages/admin/reminders.tsx` — Reminder management (search, deactivate)
- `src/pages/api/admin/settings.ts` — GET (public) / PUT (admin-only) site settings
- `src/pages/api/admin/stats.ts` — Admin stats endpoint
- `src/pages/api/admin/users.ts` — Admin user management API
- `src/pages/api/admin/stamps.ts` — Admin stamp management API
- `src/pages/api/admin/reminders.ts` — Admin reminder management API
- `src/pages/api/admin/feedback.ts` — Admin feedback management API (GET list, DELETE)
- `src/pages/admin/feedback.tsx` — Feedback viewer: expandable cards with issue type badges, search, delete
- `src/pages/admin/sponsors.tsx` — Sponsor management: add/edit/delete records, visibility toggle, stats, payment QR settings
- `src/pages/api/admin/sponsors.ts` — Sponsor CRUD API (GET public with visible_only, POST/PUT/DELETE admin-only)
- `src/pages/sponsor.tsx` — Public sponsor page: payment QR codes, sponsor list, cumulative stats
- `src/lib/server/rate-limit.ts` — In-process sliding-window rate limiter: `rateLimit(key, limit, windowMs)` + `getClientIp(req)`

## Architecture

The lookup flow: API request → try RDAP → fallback to WHOIS → merge results → if still empty try yisi.yun fallback → cache in Redis → return to client.

### Lookup fallback chain

1. **RDAP** (`node-rdap` + bootstrap) — primary, returns structured JSON
2. **WHOIS** (`whoiser` + custom servers) — secondary, raw text parsed by `common_parser.ts`
3. **yisi.yun API** (`src/lib/whois/yisi-fallback.ts`) — tertiary; only invoked when both RDAP and WHOIS fail or return empty/error data for a domain query. Supports unusual TLDs with no public RDAP/WHOIS server. Zero overhead when native lookups succeed.

## Version History (current: 1.9)

- **v1.9** — Page smoothness: page transition 0.28 s → 0.22 s + ease-out-expo curve, `will-change` GPU hint, `prefers-reduced-motion` full support, smooth scroll, preconnect hints for exchange-rate API / IANA RDAP in `_document.tsx`
- **v1.8** — Lookup speed: WHOIS merge-wait 600 → 350 ms, progressive-fallback trigger 3 500 → 3 000 ms, whoiser eager warm-up at module init, TLD DB calls halved for 2-part domains (tld === tldSuffix deduplication)
- **v1.7** — API security: IP sliding-window rate limiting 40 req/min, GET-only method check, query length ≤ 300 chars, control-char rejection, standard X-RateLimit-* headers; four access-control toggles (disable_login / maintenance_mode / query_only_mode / hide_raw_whois) enforced in navbar + login + _app.tsx + query page

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
| `POSTGRES_URL` | **Yes** | — | Supabase/Neon PostgreSQL pooling URL |
| `POSTGRES_URL_NON_POOLING` | **Yes** | — | Direct connection for migrations |
| `NEXTAUTH_SECRET` | **Yes** | — | Random secret for JWT signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | **Yes** | — | Production URL e.g. `https://your-app.vercel.app` |
| `RESEND_API_KEY` | **Yes** | — | Resend API key for sending emails |
| `RESEND_FROM_EMAIL` | **Yes** | `noreply@x.rw` | Verified sender address on Resend |
| `NEXT_PUBLIC_BASE_URL` | Recommended | NEXTAUTH_URL | Base URL used in email links |
| `CRON_SECRET` | Recommended | — | Protects cron jobs; Vercel sends as `Authorization: Bearer` |
| `WHOIS_TIMEOUT_MS` | No | 10000 | WHOIS query timeout in ms (keep ≤ 8000 on Hobby plan) |
| `NEXT_PUBLIC_MAX_WHOIS_FOLLOW` | No | 0 | WHOIS follow depth (0 = fastest) |
| `REDIS_URL` | No | — | Redis connection URL (optional caching) |
| `REDIS_CACHE_TTL` | No | 3600 | Result cache TTL in seconds |

See `.env.example` for complete reference with comments.

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
- `reminders` — domain expiry reminder subscriptions (`phase_flags TEXT` column required — run migration below)
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

### Pending DB Migrations
Run in **Supabase Dashboard → SQL Editor**:
```sql
-- Add phase_flags column to reminders table (phase event notification preferences)
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS phase_flags text DEFAULT NULL;
```
The column is optional — the code defaults all phase flags to `true` if the column is missing or null, so existing subscriptions are unaffected until users re-subscribe.

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

## IDN / Chinese Domain Handling

- **WHOIS punycode conversion**: `getLookupWhois` converts non-ASCII domains (e.g., `亲爱的.中国`) to their punycode equivalents (e.g., `xn--7lq487f54c.xn--fiqs8s`) via `domainToASCII()` before querying the WHOIS server
- **DNS probe punycode**: `probeDomain` similarly converts IDN inputs to punycode before DNS lookups
- **"No matching record" = available**: When WHOIS returns a "no match / not found" type response (pattern set `WHOIS_NOT_REGISTERED_PATTERNS`), the code treats this as "domain available" rather than a lookup failure — skipping the DNS fallback probe (which gives false positives for TLDs with wildcard A records like `.中国`). Yisi.yun is still tried first; if it fails, the domain is returned with `dnsProbe.registrationStatus: "unregistered", confidence: "high"` so the AvailableDomainCard is shown correctly.

## Dev Server

Runs on port 5000 via `pnpm run dev` (next dev -p 5000 -H 0.0.0.0).

## Tian.hu (田虎) Integration

Free public API (25 req/min, 300 req/day), no auth required.

### Integrated Features

| Feature | Endpoint | Usage |
|---------|----------|-------|
| WHOIS fallback | `/whois/{domain}` | `src/lib/whois/tianhu-fallback.ts` (tried before yisi.yun) |
| Domain pricing | `/tlds/pricing/{tld}` | `src/lib/pricing/client.ts` (3rd source, merged) |
| Translation | `/translate/{stem}` | `src/pages/api/tianhu/translate.ts` → shown on result page |
| DNS records | `/dns/{domain}` | `src/pages/api/tianhu/dns.ts` → shown on result page |

### Result Page Display

**Translation strip** (`[...query].tsx`):  
- Fetched client-side via `useEffect` when domain changes
- Displayed horizontally between "time·source" row and dates section
- Shows: "含义 **{zh translation}** {pos tag} {meaning}" in violet
- Only shown when `dst !== null` (omits pure-numeric domains, IPs)

**DNS Records card** (`[...query].tsx`):
- Shown after the WHOIS Name Servers card
- Displays A, NS, MX, SOA, TXT, AAAA records with TTL
- Skeleton loading animation while fetching
- Records animate in staggered with opacity

### Anti-Flicker Improvements

- ResultSkeleton now wrapped in `AnimatePresence` with opacity 0→1/0 transitions (no abrupt switch)
- Main result cards use pure `opacity` animation (no scale → no "pop" effect)
- Async-loaded sections (translation, DNS) animate in smoothly without layout shift

## Database Schema (Full Table List)

All persistent state lives in PostgreSQL (`src/lib/db.ts`). Tables auto-created on startup via `runMigrations()`.

| Table | Purpose |
|-------|---------|
| `users` | Registered accounts — email, password_hash, disabled, avatar_color, email_verified, etc. |
| `password_reset_tokens` | Secure time-limited reset links |
| `stamps` | Domain brand claims, awaiting admin verification |
| `reminders` | Domain expiry alert subscriptions |
| `reminder_logs` | Tracks which reminder phases have been sent (dedup) |
| `tool_clicks` | Aggregate link-click counts for Tools/Links pages |
| `user_tool_clicks` | Per-user link-click history |
| `search_history` | All queries (user_id nullable — anonymous queries also recorded) |
| `feedback` | User-submitted issue reports |
| `site_settings` | Key-value admin settings (title, OG, API keys, announcements) |
| `tld_fallback_stats` | Per-TLD failure tracking; enables 3rd-party fallback after 3 consecutive failures |
| `custom_whois_servers` | Admin-managed custom WHOIS server overrides (JSONB per TLD) |
| `rate_limit_records` | DB-backed rate limiting (key = IP, count + reset_at per 60s window) |

**Concurrent migration guard**: `getDbReady()` uses a shared Promise lock (`global.__pgMigrating`) so parallel Next.js requests on cold start never trigger duplicate migrations.

## Rate Limiting

`src/lib/rate-limit.ts` — DB-backed with in-memory fast-path:
- Hot path: in-memory Map for IPs seen within current server process window
- Cold path: atomic `INSERT … ON CONFLICT DO UPDATE` into `rate_limit_records`
- Fallback: pure in-memory if DB unavailable
- `checkRateLimit(ip, maxRequests)` is now `async` — all call sites use `await`

## TLD Smart Fallback Gate

`src/lib/whois/tld-fallback-gate.ts` — prevents over-reliance on paid 3rd-party APIs:
- Tracks per-TLD failure count in `tld_fallback_stats`
- Native RDAP/WHOIS failures increment count; success resets to 0
- Third-party APIs (tianhu / yisi) only invoked when `fail_count >= 3` AND `use_fallback = true`
- Admin UI: `/admin/tld-fallback` — view stats, toggle fallback per TLD, bulk clear

## v2.0 — UI Micro-Interactions

- **Button press feedback**: `Button` base class gains `active:scale-[0.96] touch-manipulation select-none` — all buttons scale slightly on press
- **Spring physics clicks**: `src/components/motion/clickable.tsx` — `<Clickable>` wraps any child with a Framer Motion spring (stiffness 600 / damping 32 / mass 0.6) for a natural squish-and-release feel
- **TLD page tab animation**: `AnimatePresence mode="wait"` with x-slide + fade between "TLD List" and "WHOIS Servers" tabs (0.22s ease-out-expo)
- **Server row edit expansion**: Inline edit form animates open/closed with `height: 0 → auto` via `motion.div`; row → form swap is wrapped in per-row `AnimatePresence mode="wait"`
- **Add-server form**: Same height animation via `AnimatePresence` wrapping the `showAdd` conditional
- **Global tap delay elimination**: `globals.css` adds `touch-action: manipulation` to all `button`, `a`, `[role="button"]`, `select` elements — removes 300 ms iOS tap delay everywhere

## Admin Backend Pages

| Page | Route |
|------|-------|
| Dashboard | `/admin` |
| Users | `/admin/users` |
| Brand Claims | `/admin/stamps` |
| Reminders | `/admin/reminders` |
| Search Records | `/admin/search-records` |
| User Feedback | `/admin/feedback` |
| TLD Fallback Stats | `/admin/tld-fallback` |
| System Status | `/admin/system` |
| API Keys | `/admin/api` |
| Site Settings | `/admin/settings` |
| Invite Codes | `/admin/invite-codes` |
| Friendly Links | `/admin/links` |

## Admin-Managed Content (v2.0)

### Friendly Links (`/links`)
- Fully DB-backed: `friendly_links` table (id, name, url, description, category, sort_order, active)
- Public API: `/api/links` (GET active links, sorted by sort_order then id)
- Admin CRUD: `/api/admin/links` (GET/POST/PUT/DELETE)
- Admin page: `/admin/links` — create/edit/delete/toggle visibility, optional category grouping
- Links page groups by category, shows empty state when no links added
- Subtitle and title customizable via `links_title` / `links_content` in site settings

### About Page (`/about`)
- Chinese intro (`about_content`), English intro (`about_intro_en`) — both editable in admin settings
- Contact email (`about_contact_email`) — shown as a mailto link on about + links pages
- GitHub URL (`about_github_url`) — shown in tech stack section
- Thanks/acknowledgements (`about_thanks`) — JSON array `[{name, url, desc, descEn}]`, falls back to hardcoded defaults
- All fields editable via Admin Settings → 关于页面 section

## Domain Subscription Enhancement (v2.0)

### DB-Configurable TLD Lifecycle Rules
- `tld_lifecycle_overrides` table: admin-set grace/redemption/pendingDelete days per TLD
- `src/lib/server/lifecycle-overrides.ts`: 5-minute in-memory cache; `loadLifecycleOverrides()` + `invalidateLifecycleOverridesCache()`
- `getTldLifecycle()` and `computeLifecycle()` in `lifecycle.ts` accept optional `overrides` dict; DB values take priority over hardcoded table
- Admin API: `/api/admin/tld-lifecycle` — GET list, POST create (id auto-gen), PATCH update, DELETE; all writes call `invalidateLifecycleOverridesCache()`
- Admin page: `/admin/tld-lifecycle` — searchable table, add/edit/delete dialog, shows TLD + days + registry + built-in comparison

### Drop Notifications (v2.0)
- `dropApproachingHtml` + `domainDroppedHtml` templates added to `src/lib/email.ts`
- `DROP_SOON_KEY = -4`: sent when `phase === pendingDelete` AND `daysToDropDate <= 7` (not already sent)
- `DROPPED_KEY = -5`: sent when `phase === dropped` → notification then deactivate subscription
- `process.ts` loads overrides once per cron run, passes to all `computeLifecycle()` calls

### Subscription API & Dashboard Upgrade
- `/api/user/subscriptions` GET now returns computed lifecycle fields per subscription: `drop_date`, `grace_end`, `redemption_end`, `phase`, `days_to_expiry`, `days_to_drop`, `tld_confidence`
- `dashboard.tsx` removed local 13-TLD `LIFECYCLE` table + `getDomainLifecycle()` — lifecycle data now comes from the API using the full 200+ TLD table
- `urgentSubs` now includes subscriptions where `days_to_drop <= 7` (approaching drop date)
- Subscription cards show purple "X天后可抢注" badge when approaching drop; drop date rendered in purple when urgent

## Registration Security (v2.0)

### Invite Code System
- `invite_codes` table: `XXXXXX-XXXXXX-XXXXXX` uppercase codes, single-use
- `require_invite_code = "1"` site setting gates registration behind invite codes
- `subscription_access` + `invite_code_used` columns on users
- Existing users can apply codes from Dashboard → Subscription tab
- Admin API: `/api/admin/invite-codes` (GET list, POST create, DELETE by id)

### Email OTP Verification
- `/api/user/send-verify-code` — sends 6-digit code via Resend, stored in Redis (`verify:register:{email}`)
- 10-minute TTL, 60-second resend rate limit (`verify:rate:{email}`)
- Register page shows email field + "发送验证码" button with 60s countdown
- OTP input appears after code is sent; register API validates before creating account

### CAPTCHA (Human Verification)
- Provider, site key, secret key stored in `site_settings` (`captcha_provider`, `captcha_site_key`, `captcha_secret_key`)
- `captcha_secret_key` filtered from public GET; returned only for admin session
- `src/lib/server/captcha.ts` — `getCaptchaConfig()` + `verifyCaptchaToken()` supporting Turnstile and hCaptcha
- Register page: loads CAPTCHA script dynamically (explicit render mode), shows widget after invite code field
- Register API: verifies token server-side before account creation
- Admin Settings → 人机验证: provider dropdown, site key input, secret key (password) input
