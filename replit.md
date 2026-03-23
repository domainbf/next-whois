# Next Whois UI — v2.7

A fast, modern WHOIS and RDAP lookup tool supporting domains, IPv4/IPv6, ASN, and CIDR. Also includes built-in DNS, SSL certificate, and IP/ASN geolocation tools.

---

## Changelog

### v2.7 — Enhanced Domain Status Detection: Reserved / Prohibited / Suspended (2026-03-23)

**Problem:** Many ccTLD and gTLD registries express special domain states (reserved, prohibited, blocked, suspended) as free-form text in WHOIS responses rather than EPP status codes. The parser only understood structured `Domain Status:` fields, so domains like `com.tw` (WHOIS says "reserved name") were incorrectly shown as **已注册 (Registered)**.

**Two-layer fix:**

**1. `src/lib/whois/common_parser.ts` — Synthetic status injection**

After the normal EPP status deduplication pass, scans the raw WHOIS text for non-EPP state keywords and injects synthetic status entries:

| Pattern matched in raw text | Synthetic status injected | UI result |
|---|---|---|
| `reserved name`, `this name is reserved`, `domain is reserved`, `reserved by the registry`, standalone `reserved` line | `registry-reserved` | 保留域名 (amber) |
| `registration prohibited`, `cannot be registered`, `registration not available`, `not eligible for registration`, `prohibited string`, `registry banned`, `registration blocked` | `registrationProhibited` | 禁止注册 (red) |
| `suspended by registry/registrar`, `registry-suspended`, `domain is suspended` | `suspended` | 暂停 (orange) |

These patterns are conservative — specific enough to avoid false positives in WHOIS legal footer text (e.g. "all rights reserved" does NOT match "reserved name").

**2. `src/pages/[...query].tsx` — `getDomainRegistrationStatus` enhanced**

Added a raw content scan as a safety net, checking both `result.rawWhoisContent` and `result.rawRdapContent` (serialized to string) for the same patterns. This covers RDAP-sourced data where `common_parser.ts` doesn't run.

Also added `suspended` EPP code detection to the hold check: `hasSuspended = allStatusText.includes("suspended") || rawHasSuspended`.

**3. `src/lib/whois/epp_status.ts` — Two new entries**

- `registryreserved` → displayName `registry-reserved`, category `server`  
- `registrationprohibited` → displayName `registrationProhibited`, category `server`

These ensure the EPP status badge in the 状态 section shows correct Chinese/English descriptions instead of the generic "暂无标准释义" fallback.

**4. `src/pages/[...query].tsx` — EPP lock filter robustness fix**

Pre-existing bug: Some WHOIS servers (e.g. TWNIC for `.tw`) emit EPP lock statuses with **spaces** (`"client delete prohibited"`) rather than camelCase or hyphens. The original filter took only `s.split(/\s+/)[0]` ("client") which is not in the EPP lock set, letting the string pass through — and `prohibitCheckText.includes("prohibited")` was then true, incorrectly triggering the **禁止注册** badge for all Google-owned `.tw` domains.

**Fix:** The filter now checks the code against the lock set in TWO additional forms — the raw first-word AND the space/hyphen-stripped concatenated form:
```
"client delete prohibited"
  → noSep = "clientdeleteprohibited" → IN set → filtered ✓
"client-transfer-prohibited"  
  → noSep = "clienttransferprohibited" → IN set → filtered ✓
"clientUpdateProhibited" → toLowerCase → "clientupdateprohibited"
  → noSep = "clientupdateprohibited" → IN set → filtered ✓
```

**Verified results:**

| Domain | Before | After |
|---|---|---|
| `com.tw` | ● 已注册 (WRONG — WHOIS says "reserved name") | ● 保留域名 ✓ |
| `google.tw` | ● 禁止注册 (WRONG — only has EPP lock codes) | ● 正常 ✓ |
| `google.com` | ● 已注册 ✓ | ● 已注册 ✓ (no false positive) |

---

### v2.6 — RDAP-First Optimization: Massive Speed Improvement for 30+ ccTLDs (2026-03-23)

**Root cause identified and fixed:** `STATIC_NO_RDAP` in `src/lib/whois/tld-rdap-skip.ts` was incorrectly listing ~40 ccTLDs that actually have public RDAP endpoints (either via the IANA RDAP bootstrap or via `CCTLD_RDAP_OVERRIDES`). This forced all of them through the slower WHOIS path (2–6s) instead of the fast RDAP path (1–2s).

**1. `src/lib/whois/tld-rdap-skip.ts` — STATIC_NO_RDAP reduced from ~40 → 19 TLDs**

Previously listed as "no RDAP" (incorrectly — all have working RDAP):
- European ccTLDs: `.de`, `.it`, `.pl`, `.hu`, `.ro`, `.bg`, `.gr`, `.sk`, `.no`, `.fi`, `.lt`, `.lv`, `.ua`
- East/SE Asia: `.jp`, `.kr`, `.tw`, `.hk`, `.vn`, `.th`, `.sg`, `.my`, `.id`, `.ph`, `.in`
- ccTLDs with RDAP overrides: `.mm`, `.kh`, `.la`, `.np`, `.ke`, `.gh`, `.tz`, `.ug`, `.et`, `.sn`, `.iq`, `.ly`, `.tr`, `.ae`, `.il`, `.pe`, `.ph`, `.uy`
- Latin America: `.mx`, `.ar`, `.co`, `.cl`, `.pe`, `.za`

Now STATIC_NO_RDAP contains **only genuinely RDAP-less TLDs** (19 total):
`cn, mo, ru, by, kz, ir, sa, lb, eg, ma, dz, tn, bd, lk, ve, ec, bo, py, tl`

**Self-healing safety net:** If a TLD is wrongly absent from the list and RDAP fails at runtime, `markRdapSkipped()` is called automatically — it adds the TLD to the DB-backed runtime skip set, so all future requests go straight to WHOIS. No manual correction needed.

**2. `src/lib/whois/lookup.ts` — Timeout adjustments**

| Constant | Before | After | Reason |
|---|---|---|---|
| `RDAP_TIMEOUT` | 4 000 ms | 3 000 ms | HTTP/JSON servers respond in ≤2 s on Vercel; 3 s is generous |
| `WHOIS_TIMEOUT` | 8 000 ms | 7 000 ms | Reduce max wait time; legitimate slow servers still get 7 s |

**3. `src/lib/whois/rdap_client.ts` — `tryRdapOverride` internal timeout**

`AbortSignal.timeout(12000)` → `AbortSignal.timeout(2500)`. The outer `withTimeout(RDAP_TIMEOUT=3000)` already caps the entire RDAP flow; the internal 12-second signal was redundant and left dangling fetch connections alive for 12 s after the outer timeout fired.

**4. `src/lib/env.ts` — `LOOKUP_TIMEOUT` default aligned**

`8_000` → `7_000` ms — keeps the internal whoiser TCP timeout consistent with the new `WHOIS_TIMEOUT` outer cap.

**Measured results on Vercel-equivalent network (parallel RDAP + WHOIS):**

| TLD | Before | After | Source |
|---|---|---|---|
| `.sg` | ~3–4s (WHOIS) | **1.85s** | RDAP ✓ |
| `.tw` | ~3–4s (WHOIS) | **1.68s** | RDAP ✓ |
| `.jp` | ~3–4s (WHOIS) | **1.07s** (cached) | RDAP ✓ |
| `.de` | ~4.5s (WHOIS) | same | RDAP restricted by DENIC GDPR → auto-marked as rdap_skip |
| `.cn` | ~5–6s (WHOIS) | same | Kept in STATIC_NO_RDAP (no public RDAP) |

---

### v2.5 — Local-First Architecture: Bug Fixes + After-Native Fallback (2026-03-23)

**Three fixes in `src/lib/whois/lookup.ts`:**

1. **Critical bug: `UnhandledPromiseRejection` crash on RDAP-skipped TLDs (`.cn`, `.bf`, `.lu`, `.ye`, etc.)**
   - **Root cause:** `rdapPromise = Promise.reject(...)` when `skipRdap=true`, but no `.catch()` was ever attached. Node.js 15+ crashes the process on any unhandled rejection.
   - **Fix:** Changed to `Promise.resolve(null)` — safe because `rdapPromise` is excluded from `taggedRacers` and never read when `skipRdap=true`.

2. **Architecture overhaul: True "local-first" — third-party only fires after native fails**
   - **Old (broken) behavior:** A 3-second timer would fire `lookupTianhu()`/`lookupYisi()` even while WHOIS was still running (WHOIS timeout = 6s). If WHOIS takes 3–5s (common for legitimate WHOIS servers), third-party would race against it and win. Then `forceTldFallback()` would be called, permanently opening the early gate for that TLD — creating a feedback loop where the system increasingly bypassed native WHOIS in favour of third-party.
   - **New behavior:** `progressiveFallbackRacer` now uses `await Promise.allSettled([rdapPromise, whoisPromise])` — waits for ALL native lookups to genuinely settle (succeed, fail, or timeout) before calling `lookupTianhu()`/`lookupYisi()`. Third-party is truly a last resort.
   - **Bonus:** For TLDs with no WHOIS server, `getLookupWhois` rejects almost instantly ("No WHOIS server responded") so the fallback fires immediately without waiting — actually faster than the old 3s timer for quickly-failing TLDs.
   - **`nativeWon` flag:** Set to `true` when `firstNonNull()` resolves with a native result. The progressive async function checks this after `allSettled` and skips third-party calls if native already won.
   - **`forceTldFallback` preserved:** Still called when progressive wins, since with the new architecture this truly means native completely failed — justified to open the early gate for next time.

3. **WHOIS timeout increased: 6000ms → 8000ms**
   - Many legitimate WHOIS servers (especially for ccTLDs) need 5-7s to respond. Increasing the cap reduces false timeouts and unnecessary fallback gate triggers. RDAP timeout unchanged at 4000ms (HTTP/JSON is faster).

**Architecture summary:**
- `lookupTianhu`: only if `tianhu_enabled=true` in admin config (25/min, 300/day)
- `lookupYisi`: only if `yisi_enabled=true AND yisi_key` set in admin config
- Progressive path: after native settles (not on a timer)
- Early gate: after ≥3 recorded native failures for a TLD (`tld_fallback_stats` table)

---

### v2.4 — Premium Domain Pricing: Accurate API-Based Detection (2026-03-23)

**Two distinct concepts now properly separated:**
- `isPremium` (on pricing) = registry/API confirmed premium-priced TLD (price > $100 USD/EUR/CAD, OR `currencytype === "premium"` from API response)
- `negotiable` = domain name has high resale value (from domain value scoring engine — independent of TLD pricing)

**Changes:**

1. **`src/lib/pricing/client.ts` — `calcIsPremium` improved:**
   - Now also checks `r.currencytype.toLowerCase().includes("premium")` — detects registry-marked premium pricing from the Nazhumi API response field before the price-threshold fallback
   - Ensures both server-side (`getDomainPricing`) and client-side (`getTopRegistrars`) correctly propagate API-reported premium status

2. **`src/pages/[...query].tsx` — `rawPrices` client mapping updated:**
   - Now checks `r.currencytype.toLowerCase().includes("premium")` in addition to price threshold
   - Removed incorrect `result.negotiable === true` conflation from rawPrices

3. **UI — Register/Renew price badges (desktop + mobile):**
   - Normal domains: grey `text-muted-foreground` (unchanged)
   - Registry-premium TLD (isPremium = true): **amber** `text-amber-500` with amber icon
   - Renew price badge now also respects `isPremium` for amber coloring (previously had no isPremium styling)

4. **DomainReminderDialog mini card:**
   - Colors updated: `text-red-500` → `text-amber-500` for consistency with main badge row
   - 溢价 cell background: `bg-red-500/8` → `bg-amber-500/8`
   - 溢价 value: `text-red-500` → `text-amber-500`

**Result:** `ai.dev` — shows grey $4.99 register / $11.62 renew (correct: `.dev` is not a premium-priced TLD), amber "Negotiable: Yes" (correct: high-value domain name). A domain like `.ai` with $100+ registration price would show all pricing in amber.

---

### v2.3 — Full 8-Locale i18n Coverage (2026-03-23)

**Added missing translation keys to all 6 remaining locales (de, ja, ko, ru, fr, zh-tw):**
- `"search"` top-level key added to all 6 locales (was only in en + zh)
- All new nav keys added: `nav_tagline`, `nav_version_menu`, `nav_search_history`, `nav_toolbox`, `nav_login`, `nav_api_docs` + `_desc`, `nav_tlds` + `_desc`, `nav_domain_lookup` + `_desc`, `nav_dns` + `_desc`, `nav_ssl` + `_desc`, `nav_ip` + `_desc`, `nav_icp` + `_desc`, `nav_about` + `_desc`, `nav_sponsor` + `_desc` — all in native language (de/ja/ko/ru/fr/zh-tw)
- Complete `"icp"` section added to all 6 locales (32 keys each) with fully native-language translations: German, Japanese, Korean, Russian, French, Traditional Chinese
- All 8 locales (en, zh, de, ja, ko, ru, fr, zh-tw) now have 100% key coverage for navbar, ICP page, and search functionality — no more English fallbacks for known new keys

**Key count per locale:** each grew from ~402 to ~470 lines (68+ new keys per file)

---

### v2.2 — i18n Complete (2026-03-23)

**Navbar i18n (HistoryDrawer, NavDrawer, UserButton, Navbar):**
- `HistoryDrawer`: DrawerTitle, trigger `aria-label`, status label map (registered/unregistered/reserved/error/unknown), and empty-state title + description all use `t()` — no hardcoded Chinese
- `NavDrawer`: Removed `label`/`labelEn`/`description` fields; replaced with `labelKey`/`descKey` (TranslationKey) referencing `nav_api_docs`, `nav_tlds`, `nav_domain_lookup`, `nav_dns`, `nav_ssl`, `nav_ip`, `nav_icp`, `nav_about`, `nav_sponsor` and their `_desc` variants; version subtitle uses `t("nav_version_menu", {version})`; footer uses `t("nav_tagline")`
- `UserButton`: `aria-label` uses `t("nav_login")`
- `Navbar`: toolbox `aria-label` uses `t("nav_toolbox")`

**ICP page i18n (`src/pages/icp.tsx`):**
- `ICP_TYPES` array: replaced `label` with `tabKey` (`"icp.tab_web"` etc.) — rendered with `t(typeItem.tabKey)`
- `CopyButton`: `title` uses `t("icp.copy")`
- `BlackListBadge`: uses `t("icp.threat_none")` and `t("icp.threat_level", {level})`
- `RecordCard`: all `InfoRow` labels use `t("icp.field_*")` keys; "限制接入" badge uses `t("icp.field_limit")`
- `Pagination`: counter uses `t("icp.results_count", {count})`; page indicator uses `t("icp.page_of", {current, total})`
- `ApiStatusBadge`: all status text uses `t("icp.offline")` / `t("icp.check_status")`
- `IcpPage`: `<title>`, header h1/subtitle, offline banner, type-selector blacklist hint, search placeholder, search button (`t("search")`), loading overlay, error/empty states, results summary badge — all translated
- Added `t` dependency to `handleSearch` useCallback; renamed local `t`/`type` vars to `tp` to avoid shadowing

**Locale additions:**
- `locales/en.json` + `locales/zh.json`: Added `"search"` key at top level (`"Search"` / `"查询"`)

---

## Recent Changes (v2.0 → v2.1)

- **Page transitions**: y-axis slide (y:8→0 enter, y:0→-4 exit) with custom cubic-bezier [0.22,1,0.36,1] at 0.22s for silky-smooth feel
- **Result card stagger**: Main grid uses `CARD_CONTAINER_VARIANTS` (staggerChildren:0.06s) — left and right columns animate in sequence with `CARD_ITEM_VARIANTS` (y:12→0, duration:0.32s)
- **NS row animations**: Each nameserver row is a `motion.div` with spring tap (scale:0.97) and hover nudge (x:2px)
- **Domain title animation**: `motion.h2` with spring tap (scale:0.97) on click-to-copy
- **Search button**: Spring tap (scale:0.9) via `motion.div` wrapper around submit button
- **Hydration fix**: `ResultSkeleton` replaced `Math.random()` widths with deterministic fixed array `[85,72,90,65,80,70]`
- **Glass panel polish**: Added `box-shadow` for depth; dark mode shadow uses black/30
- **CSS utilities added**: `animate-fade-in-up`, `animate-fade-in`, `animate-scale-in`, `stagger-1` through `stagger-5` delay classes
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
| `WHOIS_TIMEOUT_MS` | No | 7000 | WHOIS query timeout in ms (also controls RDAP_TIMEOUT at 3000 ms; keep ≤ 7000 on Hobby plan) |
| `NEXT_PUBLIC_MAX_WHOIS_FOLLOW` | No | 0 | WHOIS follow depth (0 = fastest) |
| `REDIS_URL` | No | — | Redis connection URL (optional caching) |
| `REDIS_CACHE_TTL` | No | 3600 | Result cache TTL in seconds |

See `.env.example` for complete reference with comments.

### Redis storage:
- Lookup results cached at key `whois:{query}` with TTL from `REDIS_CACHE_TTL`
- User-managed custom WHOIS servers stored at key `whois:user-servers` (no TTL — persistent)
- Without Redis, custom servers fall back to `src/data/custom-tld-servers.json` (local only)

### Vercel plan considerations:
- **Hobby plan (10s limit)**: Default `WHOIS_TIMEOUT_MS=7000` is already safe. Total request time ≤9s.
- **Pro plan (300s limit)**: Default 7000 ms is fine; increase to 10000 for maximum ccTLD WHOIS coverage.

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
