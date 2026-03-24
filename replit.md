# Next Whois UI — v3.16

A fast, modern WHOIS and RDAP lookup tool supporting domains, IPv4/IPv6, ASN, and CIDR. Also includes built-in DNS, SSL certificate, and IP/ASN geolocation tools.

---

## Changelog

### v3.16 — UX Animations Overhaul + No-Server TLD Fast-Fail (2026-03-24)

**Scope:** Mobile UX polish and WHOIS lookup hot-path optimization.

**Changes:**

| File | Change | Detail |
|---|---|---|
| `src/pages/_app.tsx` | Removed `RouteLoadingBar` | Deleted the 2 px top loading bar and its 50-line component. Text skeleton + shimmer already provide query feedback; the bar was visually redundant. |
| `src/pages/_app.tsx` | Smoother page transition | `pageTransition` duration 0.13 s → 0.20 s; easing `"easeOut"` → cubic-bezier `[0.22, 1, 0.36, 1]` (iOS-style spring feel). |
| `src/pages/[...query].tsx` | Improved card stagger | `CARD_CONTAINER_VARIANTS` stagger 0.025 s → 0.09 s; `CARD_ITEM_VARIANTS` now includes `y: 10 → 0` slide-up with `[0.22, 1, 0.36, 1]` easing, creating a natural "main content first, secondary sidebar after" reveal on mobile. |
| `src/pages/[...query].tsx` | WHOIS/RDAP tab fade | `ResponsePanel` tab content wrapped in `AnimatePresence mode="wait"` — switching between WHOIS and RDAP now cross-fades (0.15 s) instead of hard-cutting. |
| `src/lib/whois/lookup.ts` | `isTldKnownNoServer` hot-path check | Imported from `custom-servers.ts` and checked immediately before the whoiser TCP call. When a TLD is explicitly listed as `null` in `cctld-whois-servers.json`, throws instantly (0 ms) instead of waiting for a TCP timeout, letting the tianhu/yisi fallback race immediately. |
| `src/lib/env.ts` | VERSION bumped to "3.16" | |

---

### v3.15 — DB Cache Fix: In-Memory TLD Gate + Expanded RDAP/WHOIS Skip Lists (2026-03-24)

**Scope:** Eliminated the biggest remaining latency source — a Supabase DB query on every single WHOIS request — and expanded both the RDAP-skip and ccTLD-server lists.

**Changes:**

| File | Change | Detail |
|---|---|---|
| `src/lib/whois/tld-fallback-gate.ts` | Rewrote with in-memory startup cache | `isTldFallbackEnabled()` was hitting Supabase on every call. Now loads the entire `tld_fallback_overrides` table once at startup into a `Map`; subsequent calls are pure memory lookups (0 ms). Cache invalidated via `invalidateFallbackCache()`. Result: `ab.cd` query time 12 s → 1.26 s. |
| `src/lib/whois/tld-rdap-skip.ts` | Expanded `STATIC_NO_RDAP` | Added 17 confirmed no-RDAP ccTLDs: `.ac .aw .ax .bj .bv .cc .cg .cx .gg .hm .im .je .ms .pm .re .sh .yt`. Prevents wasted RDAP round-trips for these TLDs. |
| `src/data/cctld-whois-servers.json` | Comprehensive ccTLD server list | Grew from 206 → 255 entries covering all IANA ccTLDs. Added working servers for `.ad` (nic.ad), `.bh` (nic.bh), `.fm` (nic.fm), `.gf/.gp/.mq` (whois.nic.mq), `.gn` (ande.gov.gn), `.ls/.mc/.mr/.sl/.sm/.ss/.td` (nic.{tld}), `.mt` (whois.ripe.net), `.sr` (whois.sr), `.ye` (y.net.ye). `null` entries for TLDs with no reachable public server (`.cu`, `.kp`, `.gb`, etc.). |
| `src/lib/whois/custom-servers.ts` | `isTldKnownNoServer()` added | Exposes which TLDs are explicitly `null` in the cctld file. Builds a `Set<string>` (`_knownNoServerCache`) during `getAllCustomServers()` load; `isTldKnownNoServer(tld)` is a fast O(1) lookup. |
| `src/lib/env.ts` | VERSION bumped to "3.15" | |

---

### v3.14 — Query Speed: Timeout Tuning + Parallel Fallback Racing (2026-03-24)

**Scope:** Reduced all network timeouts and started the third-party fallback in parallel with native lookups instead of waiting for full TCP failure.

**Changes:**

| File | Change | Detail |
|---|---|---|
| `src/lib/whois/lookup.ts` | Timeout reductions | `RDAP_TIMEOUT` 7 s → 2 s; `WHOIS_TIMEOUT` 7 s → 4 s; `FALLBACK_START_MS` added at 2 s — fallback races natively after this delay instead of waiting for TCP timeout. |
| `src/lib/whois/tianhu-fallback.ts` | `TIANHU_TIMEOUT` | Set to 4 s (was unbounded). |
| `src/lib/whois/yisi-fallback.ts` | `YISI_TIMEOUT` | Set to 4 s (was unbounded). |
| `src/lib/pricing/client.ts` | Pricing timeout | Reduced to 4 s. |
| `src/lib/env.ts` | VERSION bumped to "3.14" | |

---

### v3.13 — Remove MOZ DA/PA/Spam Feature (2026-03-24)

**Scope:** Removed the MOZ Domain Authority / Page Authority / Spam Score feature entirely from the domain result page.

**Changes:**

- Removed all MOZ API calls, UI components, and related code from `src/pages/[...query].tsx`
- Removed MOZ-related environment variable references
- Cleaned up unused imports and state variables
- `src/lib/env.ts` VERSION bumped to "3.13"

---

### v3.12 — X.RW Full Rebranding + WeChat OG Image Fix (2026-03-24)

**Scope:** Complete visual rebranding to X.RW identity, with brand image assets and social sharing fixes.

**Changes:**

- Replaced all NEXT WHOIS branding with X.RW across navbar, OG images, meta tags, and site settings defaults
- Added X.RW brand images (`/public/brand/`) for OG cards and apple-touch-icon
- Fixed WeChat `og:image` — now always resolves to an absolute URL using canonical site origin
- Updated `apple-touch-icon`, `manifest.json` icons, and PWA manifest to X.RW assets
- `src/lib/env.ts` VERSION bumped to "3.12"

---

### v3.11 — Brand Stamp Certification: tian.hu / nazhumi.com / yisi.yun (2026-03-24)

**Scope:** Certified three technology-partner domains as official brand stamps in the X.RW stamp registry.

**Changes:**

- Added verified brand stamps for `tian.hu` (tianhu WHOIS data provider), `nazhumi.com` (domain pricing data), and `yisi.yun` (WHOIS fallback API)
- Stamp records created with `brand` style and appropriate card themes
- `src/lib/env.ts` VERSION bumped to "3.11"

---

### v3.10 — OG Image Text Editor, Changelog Sync & UX Cleanup (2026-03-24)

**Scope:** Admin panel enhancements and UX improvements.

**New features / fixes:**

- **OG image text editor (`/admin/og-styles`):** Brand name and tagline are now fully editable in the admin panel. Settings stored in `site_settings` (`og_brand_name`, `og_tagline`) with 5-minute server-side cache invalidation. Both fields are immediately reflected across all 8 OG card styles without code changes.
- **`api/og.tsx` — dynamic text:** All 10 hardcoded `"RDAP+WHOIS"` brand label occurrences across the 8 OG styles now read from the config API. Taglines similarly use the configurable tagline field. Default values remain `"RDAP+WHOIS"` and `"WHOIS / RDAP · Domain Lookup Tool"` when not overridden.
- **`api/og-config.ts` — extended config:** Config API now returns `brand_name` and `tagline` alongside `enabled_styles`, and accepts `PUT` requests to update them.
- **Changelog sync button (`/admin/changelog`):** "同步版本历史" button batch-imports predefined version entries (v3.6–v3.10) from the `changelog-sync` API, skipping duplicates. Useful for seeding a fresh DB.
- **User dashboard — value-tier badges hidden:** High-value / valuable domain badges in the search history list are no longer shown to users (data is still recorded server-side for admin analytics). Removed `tierCfg` badge render; `TIER_CFG` definition and `value_tier` recording untouched.

---

### v3.9 — API Key Authentication System (2026-03-24)

**Scope:** Complete API Key management system. Admins can create, revoke, and scope access keys, and optionally enforce key authentication across all public API endpoints.

**New features:**

- **`access_keys` DB table:** Stores keys with fields: `id`, `key` (`rwh_` + 40 hex), `label`, `scope` (`api` / `subscription` / `all`), `is_active`, `created_at`, `expires_at`, `last_used_at`, `use_count`. Auto-provisioned via `initDb()`.
- **`src/lib/access-key.ts` library:** `generateKey()` (rwh_ prefix + 40 hex chars), `validateApiKey()` (checks active, expired, scope), `extractApiKey()` (reads `X-API-Key` header or `?key=` query param), `enforceApiKey(req, res, scope)` (returns `boolean` — returns early if invalid), `isApiKeyRequired()` (reads `site_settings.require_api_key` with 30 s in-memory cache).
- **`/api/admin/access-keys` endpoint (GET/POST/PATCH/DELETE):** Full CRUD + a `POST { action: "toggle_require", enabled: bool }` to flip global enforcement; cache invalidated on toggle.
- **`/admin/access-keys` page:** Lists all keys (masked), shows scope badge, use count, last-used date; global enforcement toggle; "Generate Key" modal with label/scope/expiry fields; newly-created key revealed once in a dismissible alert; per-row enable/disable and delete actions.
- **Admin nav:** Added "密钥" entry pointing to `/admin/access-keys`.
- **API enforcement:** `enforceApiKey()` inserted (after rate limit, before business logic) in `api/lookup.ts`, `api/dns/records.ts`, `api/dns/txt.ts`, `api/ssl/cert.ts`, `api/ip/lookup.ts`. When `require_api_key = 0` (default), enforcement is a no-op (zero overhead).
- **Docs page:** New "API Key 鉴权" section with `#api-key` anchor; nav pill added; covers: header vs query-param usage, scope table, error response codes (401 / 403). `SectionHeader` updated to accept optional `id` prop.

---

### v3.8 — Page Transition Fixes, URL Param Loading & API Rate Limiting (2026-03-23)

**Scope:** Fixed multiple UX and security bugs accumulated since v3.6. Transitions now reliably fire between domain searches; tool pages correctly load query params from the URL on first render; DNS/IP/SSL APIs are now rate-limited.

**Bug fixes:**

- **`_app.tsx` — animationKey logic was inverted:** Pages under `/[...query]` all shared the same animation key (`router.pathname` = `/[...query]`), so navigating between domain searches produced no transition. Fixed by swapping the key strategy: shallow tool pages (`/dns`, `/ssl`, `/ip`, `/icp`, `/stamp`) use `router.pathname` (so they don't re-animate when the query string changes), and all other pages (including `/[...query]`) use `router.asPath` (so each unique domain URL gets its own transition).
- **`_app.tsx` — Restored `AnimatePresence mode="wait" initial={false}`** with a `motion.div` using pure-opacity `pageVariants` (0 → 1, 0.13 s). The previous v3.6 CSS-only approach was removed in favour of this corrected Framer Motion approach.
- **`[...query].tsx` — Card stagger restored (opacity-only):** The over-aggressive v3.6 removal of all stagger is reverted. Cards now stagger at 0.025 s intervals with opacity-only variants (no y-axis movement), keeping the feel smooth without the earlier jitter.
- **`dns.tsx` / `ssl.tsx` / `ip.tsx` — `router.isReady` missing from `useEffect`:** All three tool pages were reading `router.query` in a `useEffect(fn, [])` that ran before Next.js had populated the query object on first render, causing URL `?q=` params to be silently ignored. Changed dependency arrays to `[router.isReady]` with an early-return guard.
- **DNS/IP/SSL APIs — no rate limiting:** `api/dns/records`, `api/dns/txt`, `api/ip/lookup`, and `api/ssl/cert` had no request throttling, leaving them open to abuse. Added in-memory `rateLimit()` checks (60/min for DNS, 30/min for IP, 20/min for SSL) with `429` responses.

---

### v3.7 — Smart Redis Cache with Adaptive TTL (2026-03-23)

**Scope:** Replaced the flat-TTL Redis cache with a domain-type-aware intelligent cache layer. All lookups now avoid redundant WHOIS/RDAP server calls, with cache expiry tuned to how quickly each domain type's data actually changes.

**Cache TTL strategy:**

| Domain type | TTL | Rationale |
|---|---|---|
| IP / ASN / CIDR query | 24 h | IP allocations change extremely rarely |
| Registry-reserved / pending | 12 h | Slow-moving administrative status |
| Available / unregistered | 5 min | Could be registered at any moment |
| Registered, expired (≤0 d) | 10 min | May be re-registered imminently |
| Registered, expiring ≤7 d | 30 min | Could change hands soon |
| Registered, remaining ≤60 d | 1 h | Watch for changes |
| Registered, remaining >60 d | 6 h | Very stable — safe to cache long |
| Error / failed lookup | 0 | Never cache failures |

**Changes:**

| File | Change | Detail |
|---|---|---|
| `src/lib/whois/types.ts` | Added `cachedAt?: number` and `cacheTtl?: number` to `WhoisResult` | `cachedAt` = Unix ms timestamp when result was cached; `cacheTtl` = remaining TTL seconds (from Redis `TTL` command when serving from cache, or initial TTL when freshly computed). |
| `src/lib/server/redis.ts` | Production-grade Redis client rewrite | Added `lazyConnect: true`, `enableOfflineQueue: false` (commands fail immediately when disconnected instead of queuing), `retryStrategy` capped at 3 retries, per-event `_available` flag tracked via `ready`/`close`/`reconnecting`/`end` events. Added `getRemainingTtl(key)` and `getJsonRedisValueWithTtl(key)` helpers (pipeline GET + TTL in one round-trip). |
| `src/lib/whois/lookup.ts` | `computeSmartTtl(result)` function | Exported function that classifies a `WhoisResult` and returns the appropriate cache TTL in seconds. Zero means "do not cache". |
| `src/lib/whois/lookup.ts` | `lookupWhoisWithCache` upgraded | L1 (memory, 30 s) → L2 (Redis, smart TTL). Cache hits return `cachedAt` + `cacheTtl` from stored metadata + live Redis TTL. Cache misses: compute smart TTL, store `{ cachedAt, cacheTtl }` in the stored object, write to Redis with that TTL. Failures (status=false) are never cached. |
| `src/pages/api/lookup.ts` | Dynamic `Cache-Control` header | `s-maxage` is now set to the actual smart TTL (e.g. 21600 for stable domains, 300 for available). `stale-while-revalidate` = min(TTL × 4, 86400). Vercel edge cache now matches Redis expiry. Also passes `cachedAt` and `cacheTtl` through in the JSON response. |
| `src/pages/[...query].tsx` | Cache TTL displayed in result footer | When a result is served from cache, the time strip shows e.g. `0.00s · cached (6h)` — the parenthesised value is the remaining TTL from Redis, formatted as Xh / Xm / Xs. |
| `src/lib/env.ts` | VERSION bumped to "3.7" | |

**Environment variables (Redis connection — any one set activates Redis):**

| Variable | Description |
|---|---|
| `KV_URL` or `REDIS_URL` | Full Redis connection URL (e.g. `redis://...` or `rediss://...`). Vercel KV uses `KV_URL`. Upstash uses `REDIS_URL`. |
| `REDIS_HOST` | Redis hostname (used if URL not set) |
| `REDIS_PORT` | Redis port (default 6379) |
| `REDIS_PASSWORD` | Redis password |
| `REDIS_DB` | Redis database index (default 0) |

### v3.6 — Mobile Animation Fix: No More Flash/Jitter (2026-03-23)

**Scope:** Eliminated all sources of mobile page-transition flash and result-card jitter.

**Root causes fixed:**
1. `AnimatePresence mode="sync"` in `_app.tsx` caused old and new pages to overlap during navigation, making the background "bleed through" and flash white/dark between pages.
2. `CARD_ITEM_VARIANTS` with `y: 12` + `staggerChildren: 0.06` in `[...query].tsx` made result cards appear to jump upward one-by-one, visually jittery on mobile.
3. "Available domain" hero section in `[...query].tsx` had `delay: 0.15 / 0.2 / 0.35` on motion elements, causing content to pop in piece-by-piece.
4. `dns.tsx` result cards had `y: 4` + `delay: index * 0.03` stagger, causing visible card cascade on mobile.

**Changes:**

| File | Change | Detail |
|---|---|---|
| `src/styles/globals.css` | Added `.page-enter` CSS class | Pure opacity fade-in (0.12 s ease-out) using `@keyframes page-enter`. No transform, no `will-change`. |
| `src/pages/_app.tsx` | Removed `AnimatePresence` + `motion.div` page wrapper | Replaced with a plain `<div key={animationKey} className="page-enter">`. React unmounts old div, mounts new div with CSS animation — zero overlap, zero background flash. Also removed unused `pageVariants`, `pageTransition` constants and framer-motion import from this file. |
| `src/pages/[...query].tsx` | `CARD_CONTAINER_VARIANTS`: removed stagger | Changed from `staggerChildren: 0.06, delayChildren: 0.02` to a simple `duration: 0.15` fade-in for the entire container. |
| `src/pages/[...query].tsx` | `CARD_ITEM_VARIANTS`: removed y-axis movement | Items are now `opacity: 1` in both hidden and visible states — the container fade handles the appearance. No per-item stagger or y-offset. |
| `src/pages/[...query].tsx` | "Available domain" hero: removed delayed animations | Replaced `motion.div` (scale: 0.8→1, delay 0.15) for status badge, `motion.div` (delay 0.2) for domain name, and `motion.a` (scale: 0.95→1, delay 0.35) for CTA button with static `div`/`a` elements. Content appears instantly. |
| `src/pages/[...query].tsx` | Translation pill: removed y-axis offset | Changed `initial={{ opacity: 0, y: -4 }}` to `initial={{ opacity: 0 }}` only. |
| `src/pages/dns.tsx` | Removed `y: 4` stagger from result cards | Both `found` and `not-found` result cards now animate opacity-only (`initial={{ opacity: 0 }}`) with no per-index delay. |
| `src/lib/env.ts` | VERSION bumped to "3.6" | |

### v3.5 — Anonymous History Cap + Enriched Admin Backend (2026-03-23)

**Scope:** Anonymous query history capped at 50 (new replaces old). Admin backend fully enriched: user management gains subscription_access/email_verified toggles and per-user stats; search records gains individual-row delete, anonymous filter, and DB-tier badges; dashboard gains today's counters and richer stats; admin stats API expanded.

**Changes:**

| File | Change | Detail |
|---|---|---|
| `src/pages/api/lookup.ts` | Anonymous history: 50-cap + replace semantics | `saveAnonymousSearchRecord()` now: DELETE existing record for same query (user_id IS NULL), INSERT new record, then trim to `MAX_ANON_HISTORY = 50` (keep newest 50). Replaces the old 24-hour dedup approach. |
| `src/pages/api/admin/users.ts` | Added `subscription_access`, `email_verified` to SELECT/PATCH | All GET responses now include `subscription_access`, `email_verified`, `search_count`, `stamp_count`, `reminder_count` per user. PATCH accepts `subscription_access` and `email_verified`. New `subscribedCount` and `verifiedCount` summary counts in GET response. |
| `src/pages/api/admin/users.ts` | Added `subscribed` and `verified` filter options | Filter by `?filter=subscribed` or `?filter=verified` to show only users with subscription access or verified email. |
| `src/pages/api/admin/search-records.ts` | Individual record DELETE via `?id=xxx` | `DELETE /api/admin/search-records?id={id}` removes a single record. Also added `period=anonymous` and `user_id=null` bulk-delete options. |
| `src/pages/api/admin/search-records.ts` | Anonymous filter + anon/logged stats | `?filter=anonymous` returns only `user_id IS NULL` records. Stats response now includes `anonymous` and `logged` counts. Daily stats include `anon` column. Value tier now read from DB column (no recompute). |
| `src/pages/api/admin/stats.ts` | Added `anonSearches`, `todaySearches`, `todayUsers`, `subscribedUsers` | Dashboard overview can show today's activity pulse and subscription user count. |
| `src/pages/admin/index.tsx` | Today's activity bar + subscription stat card | Shows "今日动态" bar with new users / queries / anon count. Added "订阅用户" stat card. Recent searches show ghost icon for anonymous. |
| `src/pages/admin/users.tsx` | Full user management enrichment | Edit modal: subscription_access toggle (amber), email_verified toggle (emerald), disabled toggle (red), per-user stat mini-cards (searches / stamps / subscriptions). User list: VIP crown icon for subscription users, verified badge, stat chips, subscription quick-toggle button. Filter tabs: added "已订阅" and "已验证". |
| `src/pages/admin/search-records.tsx` | Individual delete + anonymous filter + DB tier badge | Each row has a delete button (appears on hover). New "匿名查询" filter tab. Stats strip expanded to 8 cards (anon + logged). Bulk delete adds "清空匿名记录". Value tier badge now reads from DB (no client-side score recompute). User/anon breakdown bar chart added to stats panel. |
| `src/lib/env.ts` | VERSION bumped to "3.5" | |

### v3.4 — Mobile UX: Instant Nav Feedback + Tiered History Retention + Pagination (2026-03-23)

**Scope:** Three parallel improvements: (1) immediate tap feedback on navigation via top loading bar; (2) smoother page transitions (pure opacity, no y-axis jank); (3) search history now has tiered expiry, 100-record cap, per-page pagination, value-tier badges, and confirmed delete-all.

**Changes:**

| File | Change | Detail |
|---|---|---|
| `src/pages/_app.tsx` | Added `RouteLoadingBar` component | 2 px primary-colour bar at top of screen. Appears immediately on `routeChangeStart` (15 % → 50 % → 75 % → 100 % on complete), giving instant click feedback on mobile. Uses router events, no external dependency. |
| `src/pages/_app.tsx` | Simplified page transition animation | Removed y-axis offset (`y: 6`/`y: -3`). Now pure opacity fade only (`0 → 1 → 0`), duration reduced to 0.15 s. Eliminates vertical jank that was especially noticeable on mobile. |
| `src/pages/_app.tsx` | Removed `willChange` hint | `willChange: "opacity, transform"` removed; `transform` is no longer needed since y-axis motion is gone. |
| `src/lib/db.ts` | Added `value_tier` column to `search_history` | `ALTER TABLE … ADD COLUMN IF NOT EXISTS value_tier TEXT NOT NULL DEFAULT 'normal'`. Stores computed domain value tier alongside each record for retention-rule enforcement. |
| `src/pages/api/user/search-history.ts` | Tiered retention cleanup (`pruneExpired`) | Runs after every POST. SQL removes records older than: 10 d (normal), 20 d (valuable, score ≥ 35), 50 d (high, score ≥ 55). |
| `src/pages/api/user/search-history.ts` | `MAX_HISTORY` 500 → 100 | Normal users now capped at 100 records. Oldest records trimmed after every write via `trimToLimit`. |
| `src/pages/api/user/search-history.ts` | Computes and stores `value_tier` on insert | `computeValueTier()` uses `scoreDomain()`: high (≥55) / valuable (≥35) / normal. Only for `domain` queries with `unregistered` status; all others default to `normal`. |
| `src/pages/api/user/search-history.ts` | GET now supports pagination | Accepts `?page=N`, returns `{ history, total, page, pages }`. Page size = 20. |
| `src/pages/dashboard.tsx` | History pagination state + controls | New states: `historyPage`, `historyTotal`, `historyPages`. `fetchHistory(page)` function. Prev / Next buttons shown when `pages > 1`. |
| `src/pages/dashboard.tsx` | Value-tier badges in history list | Each domain row shows a coloured "高价值" (amber) or "有价值" (violet) badge when `valueTier` is set, alongside the existing reg-status badge. |
| `src/pages/dashboard.tsx` | "全部删除" confirmation | `window.confirm` shows total count before deletion. Resets all pagination state on success. |
| `src/pages/dashboard.tsx` | Tab & stat card use `historyTotal` | History tab badge and overview card now show the server-side total instead of the current page length. |
| `src/pages/dashboard.tsx` | Retention hint footer | When only one page exists, shows "普通 10 天 · 有价值 20 天 · 高价值 50 天" instead of old "最近 50 条记录". |

### v3.3 — Fully Branded Email Templates with Dynamic Site Name (2026-03-23)

**Scope:** All outgoing system emails now read the site name from the database (`site_settings.site_logo_text`) and render it in logos, subjects, and footers. No more hardcoded "Next Whois" in any email. Covers every email route in the project.

**Changes:**

| File | Change | Detail |
|---|---|---|
| `src/lib/email.ts` | `getSiteLabel()` added with 60 s DB cache | Reads `site_logo_text` from `site_settings`; falls back to "NEXT WHOIS". Exported so any API route can call it once and pass the result down. |
| `src/lib/email.ts` | `emailLayout()` accepts `siteName` param | Logo renders site name split on last space, last word coloured with PRIMARY violet; logo is a clickable link to `BASE_URL`. Footer copyright line also uses `siteName`. |
| `src/lib/email.ts` | All builder functions accept `siteName?: string` | `welcomeHtml`, `subscriptionConfirmHtml`, `reminderHtml`, `phaseEventHtml`, `dropApproachingHtml`, `domainDroppedHtml`, `passwordResetHtml`, `adminNotifyHtml`, `feedbackHtml`, `highValueAlertHtml`, `verifyCodeHtml` all default to "NEXT WHOIS" when `siteName` is omitted. |
| `src/lib/email.ts` | `stampVerifyTimeoutHtml()` added | New styled email for DNS verification timeout on stamp/brand-claim flow. Matches app visual style; accepts `domain`, `fileContent`, `verifyUrl`, `siteName`. |
| `src/pages/api/user/register.ts` | Welcome email branded | Calls `getSiteLabel()`, uses `siteName` in subject and `welcomeHtml`. |
| `src/pages/api/user/forgot-password.ts` | Reset email branded | Calls `getSiteLabel()`, uses `siteName` in subject and `passwordResetHtml`. |
| `src/pages/api/user/send-verify-code.ts` | Verify-code email branded | Calls `getSiteLabel()`, uses `siteName` in subject and `verifyCodeHtml`. |
| `src/pages/api/admin/test-email.ts` | Test email branded | Calls `getSiteLabel()`, uses `siteName` in subject and `adminNotifyHtml`. |
| `src/pages/api/stamp/giveup-notify.ts` | Rewritten to use `stampVerifyTimeoutHtml` | Replaced raw Arial-only HTML builder with the new styled template function. Calls `getSiteLabel()`. |
| `src/pages/api/feedback.ts` | Feedback notification branded | Calls `getSiteLabel()`, passes `siteName` to `feedbackHtml`. |
| `src/pages/api/remind/submit.ts` | Subscription confirm email branded | Calls `getSiteLabel()`, passes `siteName` to `subscriptionConfirmHtml`. |
| `src/pages/api/remind/process.ts` | All reminder/phase/drop emails branded | Calls `getSiteLabel()` once per cron invocation; passes `siteName` to all 5 email builder calls (`reminderHtml`, `phaseEventHtml` ×3, `dropApproachingHtml`, `domainDroppedHtml`). |
| `src/pages/api/user/search-history.ts` | High-value domain alert branded | Calls `getSiteLabel()`, passes `siteName` to `highValueAlertHtml`. |

### v3.2 — UX Polish, Branding Consistency & Permission Flow Fixes (2026-03-23)

**Scope:** Session-wide settings caching, page transition stabilization, consistent site branding across all sub-pages, and corrected auth/permission flows in the dashboard and query pages.

**Changes:**

| File | Change | Detail |
|---|---|---|
| `src/lib/site-settings.tsx` | Added `sessionStorage` cache for site settings | Reads cached settings as initial state on first render, eliminating the title flash caused by `DEFAULT_SETTINGS` showing before the API responds. Cache is written/updated on every successful API fetch. |
| `src/pages/_app.tsx` | Fixed `AnimatePresence` key for client-search pages | Pages in `CLIENT_SEARCH_PAGES` (`/dns`, `/ip`, `/ssl`, `/icp`, `/tools`, `/feedback`) now use `router.pathname` as the animation key instead of `router.asPath`, preventing jarring exit/re-enter transitions when query params change. |
| `src/pages/dns.tsx` | Added `useSiteSettings` hook; fixed hardcoded title | `DNS 查询 — NEXT WHOIS` now uses `settings.site_logo_text` dynamically. |
| `src/pages/ssl.tsx` | Added `useSiteSettings` hook; fixed hardcoded title | `SSL 证书查询 — NEXT WHOIS` now uses `settings.site_logo_text` dynamically. |
| `src/pages/ip.tsx` | Added `useSiteSettings` hook; fixed hardcoded title | `IP / ASN 查询 — NEXT WHOIS` now uses `settings.site_logo_text` dynamically. |
| `src/pages/tools.tsx` | Added `useSiteSettings` hook; fixed hardcoded title | Tools page title now uses `settings.site_logo_text` dynamically. |
| `src/pages/icp.tsx` | Added `useSiteSettings` hook; fixed hardcoded title | ICP page title now uses `settings.site_logo_text` dynamically. |
| `src/pages/docs.tsx` | Added `useSiteSettings` hook; fixed hardcoded title + og/twitter meta | All 3 title occurrences (title, og:title, twitter:title) now use `settings.site_logo_text` dynamically. |
| `src/pages/feedback.tsx` | Fixed hardcoded title | Was already importing `useSiteSettings`; title now uses `settings.site_logo_text`. |
| `src/pages/dashboard.tsx` | Default tab changed to `stamps`; adds smart switch to `subscriptions` when user has `subscriptionAccess` | Users without subscription access now land on the Stamps tab first. Users with access auto-switch to Subscriptions tab after session loads. |
| `src/pages/dashboard.tsx` line 447 | `SubscribeGuideModal` redirect changed from `/remind` to `/stamp` | The "查看订阅管理页" button now correctly sends users to the brand-claim page (`/stamp`), not the subscription reminder page. Label updated to "前往品牌认领页". |
| `src/pages/[...query].tsx` | No-access subscribe toast now includes actionable `/stamp` redirect | Both subscribe button instances now show a toast with an "Apply / 前往申请" action button linking to `/stamp` when user lacks `subscriptionAccess`, instead of a dead-end info message. |

### v3.1 — Enom TLD Reference Chart Full Integration (2026-03-23)

**Scope:** Complete second pass of `src/lib/lifecycle.ts` corrections using the authoritative Enom TLD Reference Chart (2026-03, 922 lines). All grace/redemption/pendingDelete values for supported TLDs corrected to match Enom registrar data. New TLD entries added.

**Source:** Enom TLD Reference Chart 2026-03 (PDF, 922 lines) — authoritative for gTLDs, nTLDs, and ccTLDs where Enom offers registration.

**Comment block updates (LIFECYCLE_TABLE header):**

| TLD | Before | After | Source |
|---|---|---|---|
| `.be` note | grace 0-20d, RGP=40d | no grace, RGP=30d, 3d pre-expiry deletion | Enom 2026-03 |
| `.ch/.li` note | grace=5d, RGP=40d | no grace, RGP=14d, 10d pre-expiry | Enom 2026-03 |
| `.eu` note | no grace, RGP=40d | no grace, RGP=30d, 3d pre-expiry | Enom 2026-03 |
| `.nl` note | no grace, RGP=40d | no grace, RGP=30d, 3d pre-expiry | Enom 2026-03 |
| `.es` note | RGP=10d | RGP=14d, 12d pre-expiry | Enom 2026-03 |
| `.nz` note | grace=40d, RGP=90d | no grace, RGP=90d, 3d pre-expiry | Enom 2026-03 |
| `.au` note | grace=30d, no RGP | no grace, RGP=31d, 10d pre-expiry | Enom 2026-03 |

**Europe ccTLD corrections:**

| TLD | grace Before→After | rdmp Before→After | Source |
|---|---|---|---|
| `.de` | 10→**0** | 30→30 | Enom 2026-03: N/30 |
| `.nl` | 0→0 | 40→**30** | Enom 2026-03: N/30 |
| `.eu` | 0→0 | 40→**30** | Enom 2026-03: N/30 |
| `.es` | 0→0 | 10→**14** | Enom 2026-03: N/14 |
| `.be` | 10→**0** | 40→**30** | Enom 2026-03: N/30 |
| `.ch` | 5→**0** | 40→**14** | Enom 2026-03: N/14 |
| `.li` | 5→**0** | 40→**14** | Enom 2026-03: N/14 |
| `.am` | grace=30, rdmp=30 | **IMMEDIATE** | Enom 2026-03: N/N |

**Asia-Pacific ccTLD corrections:**

| TLD | grace Before→After | rdmp Before→After | Source |
|---|---|---|---|
| `.sg` | 30→**0** | 30→**14** | Enom 2026-03: N/14 |
| `com/net/org/edu.sg` | 30→**0** | 30→**14** | Enom 2026-03: N/14 |
| `.nz` | 40→**0** | 90→90 | Enom 2026-03: N/90 |
| `co/net/org/school.nz` | 40→**0** | 90→90 | Enom 2026-03: N/90 |
| `.in` | 40→**30** | 30→30 | Enom 2026-03: 30/30 |
| `co/net/org.in` | 40→**30** | 30→30 | Enom 2026-03: 30/30 |
| `.au` (bare TLD) | 30→**0** | 0→**31** | Enom 2026-03: N/31 |
| `.mu` | 30→**40** | 0→**30** | Enom 2026-03: 40/30 |
| `.tm` | grace=30, rdmp=0 | **IMMEDIATE** | Enom 2026-03: N/N |

**Americas ccTLD corrections:**

| TLD | grace Before→After | rdmp Before→After | Source |
|---|---|---|---|
| `.ca` | 40→**30** | 30→30 | Enom 2026-03: 30/30 |
| `.pe` | 30→**0** | 30→**10** | Enom 2026-03: N/10 |
| `com.pe` | 30→**0** | 30→**10** | Enom 2026-03: N/10 |
| `com.mx` | 30→**40** | 30→**0** | Enom 2026-03: 40/N |
| `.hn` | rdmp 0→**30** | — | Enom 2026-03: 30/30 |

**Batch 1 corrections (applied earlier in v3.1):**

| TLD | Change | Source |
|---|---|---|
| `.io` | grace 30→**32** | Enom 2026-03 |
| `.ai` | grace 30→**45** | Enom 2026-03 |
| `.la` | grace 28→**30** | Enom 2026-03 |
| `.tv` | grace 30→**42** | Enom 2026-03 |
| `.ac` / `.sh` | grace 30→**32** | Enom 2026-03 |
| `.vg` | grace 30→**32**, rdmp 30→30 | Enom 2026-03 |
| `.tc` | grace 30→**32**, rdmp 0→**30** | Enom 2026-03 |
| `.sc` / `.mn` / `.fm` / `.ms` / `.gs` / `.tk` / `.bz` | **IMMEDIATE** | Enom 2026-03 |
| `.de` | grace 10→**0** | Enom 2026-03 |
| `.nl` | rdmp 40→**30** | Enom 2026-03 |
| `.eu` | rdmp 40→**30** | Enom 2026-03 |
| `.es` | rdmp 10→**14** | Enom 2026-03 |

**New entries added:**

| TLD | Data | Registry |
|---|---|---|
| `.eus` | grace=45, rdmp=30, pd=5 | PUNTUEUS (Basque Country) |
| `.free` / `.fast` / `.hot` / `.spot` / `.talk` / `.you` | grace=40, rdmp=30, pd=5 | Amazon Registry Services |
| `com/net/org.mu` | grace=40, rdmp=30, pd=5 | ICTA (Mauritius) |

**Other changes:**
- `.inc`: grace corrected 30→42 (Enom 2026-03: 42/30)
- Duplicate `.tc` entry (line 676, old est-confidence entry) removed

---

### v3.0 — TLD Lifecycle Data Accuracy Overhaul (2026-03-23)

**Scope:** Major accuracy corrections to `src/lib/lifecycle.ts` based on cross-referencing Namecheap KB (updated 2025-09-10) and Dynadot TLD pages (verified 2026-03) against the Enom TLD Reference Chart.

**Sources:**
- Namecheap KB: https://www.namecheap.com/support/knowledgebase/article.aspx/9916/2207/tlds-grace-periods
- Dynadot TLD pages: https://www.dynadot.com/domain/[tld]
- Enom TLD Reference Chart: https://docs.google.com/spreadsheets/d/1oVNszsvqhxh3hlT1LYMfcwq3lw_e6J7DeBePvN4t2aw

**Named preset updates:**

| Preset | Before | After | Reason |
|---|---|---|---|
| `STD` (default gTLD) | grace=45, rdmp=30, pd=5 | grace=**30**, rdmp=30, pd=5 | Dynadot: 30d in practice, not 45d max |
| `AFNIC` (.fr etc.) | grace=0, rdmp=30, pd=**10** | grace=0, rdmp=30, pd=**5** | Dynadot verified: .pm/.wf delete=5 |
| `NOMINET` (.uk etc.) | grace=**92**, rdmp=0, pd=**0** | grace=**90**, rdmp=0, pd=**5** | Dynadot: grace=85/5; Namecheap: 90d total |
| `CNNIC` (.cn etc.) | grace=0, rdmp=**14**, pd=5 | grace=0, rdmp=**15**, pd=5 | Dynadot restore=15d |
| `HKIRC` (.hk etc.) | grace=**90**, rdmp=**0**, pd=0 | grace=**30**, rdmp=**60**, pd=0 | Dynadot: grace=30, restore=60 |

**Major TLD corrections:**

| TLD | Before | After | Source |
|---|---|---|---|
| `.de` | IMMEDIATE (0/0/0) | grace=10, rdmp=30, pd=25 | Dynadot: variable grace 0-20d; NOT immediate |
| `.it` | IMMEDIATE | grace=10, rdmp=30, pd=0 | Dynadot: grace=10, restore=30 |
| `.pl` | IMMEDIATE | grace=0, rdmp=30, pd=0 | Dynadot: restore=30 |
| `.no` | IMMEDIATE | grace=89, rdmp=0, pd=0 | Dynadot: 89-day grace |
| `.ie` | IMMEDIATE | grace=30, rdmp=30, pd=14 | Dynadot: grace=30, restore=30, delete=14 |
| `.be` | IMMEDIATE | grace=10, rdmp=40, pd=0 | Dynadot: variable 0-20d grace, restore=40 |
| `.cl` | IMMEDIATE | grace=10, rdmp=30, pd=10 | Dynadot: grace=10, restore=30, delete=10 |
| `.es` | IMMEDIATE | grace=0, rdmp=10, pd=0 | Namecheap: 10-day RGP only, no pendingDelete |
| `.eu` | grace=40, rdmp=0 | grace=0, rdmp=40, pd=0 | Dynadot: no grace, restore=40 |
| `.nl` | grace=40, rdmp=0 | grace=0, rdmp=40, pd=0 | Dynadot: no grace, restore=40 |
| `.ch` | grace=30, rdmp=0, pd=5 | grace=5, rdmp=40, pd=0 | Dynadot: grace=5, restore=40 |
| `.li` | grace=30, rdmp=0, pd=5 | grace=5, rdmp=40, pd=0 | Dynadot: grace=5, restore=40 |
| `.pt` | grace=30, rdmp=0 | grace=29, rdmp=0 | Dynadot: grace=29 |
| `.cz` | grace=30, rdmp=0 | grace=59, rdmp=0 | Dynadot: grace=59 |
| `.ro` | grace=30, rdmp=0 | grace=80, rdmp=0 | Dynadot: grace=80 |
| `.lt` | grace=30, rdmp=30, pd=5 | grace=0, rdmp=30, pd=0 | Dynadot: no grace, restore=30 |
| `.lv` | grace=30, rdmp=30, pd=5 | grace=0, rdmp=30, pd=0 | Dynadot: no grace, restore=30 |
| `.tw` | grace=0, rdmp=30, pd=5 | grace=32, rdmp=0, pd=10 | Dynadot: grace=32, delete=10, no restore |
| `.nz` | IMMEDIATE | grace=40, rdmp=90, pd=5 | Dynadot: grace=40, restore=90 |
| `.hk` | HKIRC (grace=90) | HKIRC (grace=30, rdmp=60) | Preset updated |
| `.in` | grace=30, rdmp=30 | grace=40, rdmp=30 | Dynadot: grace=40 |
| `.id` | grace=30, rdmp=30 | grace=40, rdmp=30 | Dynadot: grace=40 |
| `.ph` | grace=30, rdmp=0, pd=5 | grace=50, rdmp=0, pd=0 | Dynadot: grace=50, delete=0 |
| `.ae` | grace=30, rdmp=30, pd=5 | grace=20, rdmp=0, pd=0 | Dynadot: grace=20, no restore |
| `.cm` | grace=30, rdmp=0, pd=0 | IMMEDIATE | Namecheap: expires = deleted same day |
| `.nu` | grace=45, rdmp=30, pd=5 | grace=7, rdmp=60, pd=0 | Namecheap: 7d then 60d RGP |
| `.gg` | grace=45, rdmp=30, pd=5 | grace=28, rdmp=12, pd=0 | Dynadot: grace=28, restore=12 |
| `.la` | grace=45, rdmp=30, pd=5 | grace=28, rdmp=30, pd=0 | Dynadot: grace=28, no delete |
| `.to` | grace=45, rdmp=30, pd=5 | grace=40, rdmp=30, pd=5 | Dynadot: grace=40 |
| `.fm` | grace=45, rdmp=30, pd=5 | grace=30, rdmp=30, pd=4 | Dynadot: delete=4 |
| `.vg` | grace=45, rdmp=30, pd=5 | grace=30, rdmp=30, pd=4 | Dynadot: delete=4 |
| (all 45d island TLDs) | grace=45 | grace=30 | Dynadot shows 30d for all VeriSign-managed |

**SLD corrections:**
- `.co.nz` / `.net.nz` / `.org.nz` / `.school.nz`: IMMEDIATE → grace=40, rdmp=90, pd=5
- `.com.hk` and all `*.hk`: auto-updated via HKIRC preset
- `.com.ph` / `.net.ph` / `.org.ph`: grace=30/pd=5 → grace=50/pd=0
- `co.in` / `net.in` / `org.in`: grace=30 → grace=40 (matching .in TLD)

---

### v2.9 — Comprehensive TLD Lifecycle Rules Expansion (2026-03-23)

**Scope:** `src/lib/lifecycle.ts` completely rewritten. Table grew from ~150 entries to **634 total entries** (547 TLD-level + 87 SLD-level), covering the vast majority of the global domain namespace.

**Sources consulted:**
- ICANN RAA (standard gTLD: 45d grace / 30d RGP / 5d pendingDelete)
- Namecheap KB: https://www.namecheap.com/support/knowledgebase/article.aspx/9916/2207/tlds-grace-periods
- Dynadot TLD pages: https://www.dynadot.com/domain/tlds.html
- Individual registry policy pages (CNNIC, HKIRC, Nominet, AFNIC, DENIC, auDA, etc.)
- IANA root-zone database

**Accuracy corrections:**

| TLD | Before | After | Source |
|---|---|---|---|
| `.cn` | grace=0, redemption=30, pendingDelete=5 | grace=0, **redemption=14**, pendingDelete=5 | Namecheap KB / CNNIC registry-level RGP |
| `.hk` | grace=0, redemption=30, pendingDelete=5 | grace=**90**, redemption=**0**, pendingDelete=**0** | HKIRC policy (90-day renewal window, no separate RGP) |
| `.ph` | grace=30, redemption=30, pendingDelete=5 | grace=30, redemption=**0**, pendingDelete=5 | PH Domains Foundation — no redemption period |
| `.ly` | grace=30, redemption=0, pendingDelete=0 | **IMMEDIATE** (0/0/0) | LYNIC policy |
| `.au` | grace=0, redemption=0, pendingDelete=5 | grace=**30**, redemption=0, pendingDelete=5 | auDA new top-level TLD (launched 2022) |
| `com.hk` | grace=0, redemption=30, pendingDelete=5 | **HKIRC** (90/0/0) | HKIRC — consistent with .hk |

**New named presets (reusable policy families):**
- `CNNIC` — `.cn` and all `*.cn` sub-TLDs: `{ grace: 0, redemption: 14, pendingDelete: 5 }`
- `HKIRC` — `.hk` and all `*.hk` sub-TLDs: `{ grace: 90, redemption: 0, pendingDelete: 0 }`
- `NOMINET` — `.uk` and all `*.uk` sub-TLDs: `{ grace: 92, redemption: 0, pendingDelete: 0 }`
- `JPRS` — `.jp` and all `*.jp` sub-TLDs: immediate delete `{ grace: 0, redemption: 0, pendingDelete: 0 }`
- `REGISTROBR` — `.br` and all `*.br` sub-TLDs: immediate delete
- `NICAR` — `.ar` and all `*.ar` sub-TLDs: immediate delete

**New TLD categories added:**

1. **Popular new gTLDs (~60)**: `xyz`, `club`, `fun`, `icu`, `top`, `vip`, `wiki`, `ink`, `buzz`, `website`, `uno`, `bio`, `ski`, `ltd`, `llc`, `srl`, `gmbh`, `inc`, `bar`, `fit`, `fan`, `bet`, `best`, `cash`
2. **Business/professional new gTLDs (~150)**: `academy`, `accountant`, `auction`, `bargains`, `bike`, `boutique`, `cafe`, `camera`, `careers`, `casino`, `chat`, `clinic`, `coach`, `codes`, `coffee`, `community`, `condos`, `construction`, `consulting`, `coupons`, `dance`, `dating`, `dental`, `diamonds`, `doctor`, `energy`, `engineering`, `estate`, `financial`, `fitness`, `flights`, `furniture`, `games`, `glass`, `golf`, `graphics`, `guru`, `healthcare`, `hockey`, `homes`, `industries`, `insure`, `investments`, `kitchen`, `legal`, `lighting`, `limited`, `limo`, `loans`, `management`, `marketing`, `mba`, `memorial`, `mortgage`, `movie`, `ninja`, `partners`, `pet`, `photography`, `pizza`, `plumbing`, `productions`, `properties`, `pub`, `racing`, `realty`, `recipes`, `rehab`, `rentals`, `repair`, `restaurant`, `rocks`, `rugby`, `school`, `security`, `sexy`, `shoes`, `singles`, `solar`, `surgery`, `tax`, `taxi`, `technology`, `tennis`, `tips`, `today`, `tours`, `town`, `toys`, `trade`, `training`, `university`, `vacations`, `ventures`, `villas`, `vision`, `voyage`, `wine`, `works`, `wtf`, `zone` (all STD 45/30/5)
3. **Geographic / city new gTLDs (~30)**: `amsterdam`, `barcelona`, `berlin`, `brussels`, `capetown`, `cologne`, `dubai`, `istanbul`, `london`, `miami`, `nagoya`, `nyc`, `okinawa`, `osaka`, `paris`, `quebec`, `rio`, `ryukyu`, `saarland`, `tirol`, `tokyo`, `vegas`, `wien`, `yokohama`, `zuerich`, `boston`, `wales`, `scot`, `irish`, `africa`, `arab`, `nrw` (all STD)
4. **Pacific ccTLDs**: `tl` (Timor-Leste), `fj`, `pg`, `sb`, `vu`, `ki`, `nr`, `ck`, `as`, `pf`, `nc`, `gp`, `mq`
5. **African ccTLDs (~25)**: `mz`, `zw`, `zm`, `ao`, `bi`, `bj`, `bf`, `td`, `cg`, `cd`, `gq`, `gw`, `mr`, `ne`, `tg`, `bw`, `na`, `ls`, `sz`, `mw`, `mg`, `mu`, `km`, `so`, `dj`, `er`, `st`, `cv`, `gn`, `sl`, `lr`
6. **European ccTLDs**: `fo` (Faroe), `mc` (Monaco), `sm` (San Marino), `ad` (Andorra), `gi` (Gibraltar), `im` (Isle of Man), `xk` (Kosovo)
7. **Caribbean/Americas ccTLDs**: `gd`, `dm`, `bb`, `ky`, `bm`, `bs`, `tc`, `kn`, `fk`, `sr`, `aw`, `cw`, `sx`
8. **AFNIC extensions**: `pf`, `nc`, `gp`, `mq` (all managed by AFNIC, same policy as `.fr`)

**New SLD entries (87 total):**

| Country | New SLDs |
|---|---|
| Australia (auDA) | `id.au`, `asn.au`, `edu.au`, `gov.au` (existing `com/net/org.au` kept at 30/30/5) |
| Taiwan (TWNIC) | `com.tw`, `net.tw`, `org.tw`, `idv.tw`, `edu.tw`, `gov.tw` |
| Hong Kong (HKIRC) | `net.hk`, `org.hk`, `idv.hk`, `edu.hk`, `gov.hk` (all 90/0/0) |
| New Zealand (InternetNZ) | `net.nz`, `org.nz`, `school.nz`, `govt.nz` (all IMMEDIATE) |
| Japan (JPRS) | `gr.jp`, `ac.jp`, `go.jp` (all IMMEDIATE) |
| Korea (KISA) | `or.kr` |
| Singapore (SGNIC) | `net.sg`, `org.sg`, `edu.sg`, `gov.sg` |
| Malaysia (MYNIC) | `net.my`, `org.my`, `edu.my` |
| Philippines (PH Domains) | `net.ph`, `org.ph` (no redemption) |
| India (NIXI) | `co.in`, `net.in`, `org.in` |
| Israel (ISOC-IL) | `org.il`, `net.il` |
| South Africa (ZADNA) | `org.za`, `net.za`, `web.za` (all IMMEDIATE) |
| Kenya (KENIC) | `or.ke`, `ne.ke` |
| Nigeria (NIRA) | `org.ng`, `net.ng` |
| Brazil (Registro.br) | `edu.br`, `gov.br` (all IMMEDIATE) |
| Mexico (NIC México) | `org.mx`, `net.mx` |
| Argentina (NIC Argentina) | `net.ar`, `org.ar` (all IMMEDIATE) |
| Ukraine | `com.ua` |
| Turkey (NIC TR) | `org.tr`, `net.tr` (all IMMEDIATE) |
| Venezuela | `com.ve` |
| Colombia | `com.co` |
| Peru | `com.pe` |

---

### v2.8 — CN Reserved Second-Level Domain Detection (2026-03-23)

**Problem:** CNNIC reserves 43 second-level domain labels under `.cn` for official use — 34 provincial administrative codes (bj.cn, sh.cn…), 7 functional suffixes (gov.cn, edu.cn…), and 2 system domains (nic.cn, cnnic.cn). Previously, these were either showing as "已注册" (incorrect) or as a misleading "该域名已注册但注册机构未提供公开的WHOIS/RDAP服务" fallback. The WHOIS lookup took 2.4s+ and returned no useful information.

**New file: `src/lib/whois/cn-reserved-sld.ts`**

Comprehensive database of all 43 reserved CN SLDs with bilingual descriptions, organized into three maps:

| Category | Count | Example |
|---|---|---|
| `CN_PROVINCE_SLDS` — 34 provincial codes | 34 | `bj` → 北京市, `gd` → 广东省 |
| `CN_FUNCTIONAL_SLDS` — sector suffixes | 7 | `gov` → 政府机构, `edu` → 教育机构 |
| `CN_SYSTEM_RESERVED` — exact domains | 2 | `nic.cn`, `cnnic.cn` |

`getCnReservedSldInfo(domain)` checks these in priority order and returns a typed `CnReservedInfo` object (or `null` for non-reserved domains).

**Three-layer interception — in priority order:**

1. **`getServerSideProps` pre-check** (`src/pages/[...query].tsx` line ~1315) — intercepts the raw URL query BEFORE `cleanDomain()` runs. Critical because the lib's `specialDomains` map rewrites functional SLDs (e.g. `gov.cn → www.gov.cn`) to make WHOIS lookups work — without this early check, SSR would look up `www.gov.cn` (a real registered domain) instead of showing "保留域名".

2. **`lookupWhoisWithCache` pre-check** (`src/lib/whois/lookup.ts` line ~504) — the first thing called in the function, before any L1/L2 cache lookup. Ensures no stale Redis-cached result for these domains ever overrides the correct synthetic result.

3. **`/api/lookup` pre-check** (`src/pages/api/lookup.ts` line ~115) — catches client-side searches (typed into the search bar after page load) that hit the API directly.

**Synthetic result format:**

All three interception points return the same structure:
```typescript
{
  time: 0, status: true, cached: false, source: "whois",
  result: {
    domain: "gov.cn",
    status: [{ status: "registry-reserved", url: "" }],
    rawWhoisContent: "[CN Reserved] GOV.CN 是 CNNIC 保留的功能性二级域名...",
    // all other fields: Unknown / null (from initialWhoisAnalyzeResult)
  }
}
```

**UI updates:**

- `DomainStatusInfoCard` now accepts `customDesc?: { zh: string; en: string }` to override the generic "保留域名" description with the domain-specific CNNIC explanation (e.g. "BJ.CN 是 CNNIC 为北京市保留的省级行政区划域名（共34个）...")
- The call site passes `cnInfo` to the card when `regStatus.type === "reserved"`
- Cache header for CN reserved responses: `s-maxage=86400, stale-while-revalidate=604800` (24h/7d)

**Verified results:**

| Domain | Before | After |
|---|---|---|
| `bj.cn` (Beijing province) | ● 已注册 + "no WHOIS" fallback, 2.4s | ● 保留域名 + "BJ.CN 是 CNNIC 为北京市保留…" **0ms** |
| `sh.cn` (Shanghai) | ● 已注册 + "no WHOIS" fallback | ● 保留域名 + specific description **0ms** |
| `gov.cn` (Government) | ● 正常 (showing www.gov.cn data!) | ● 保留域名 + "GOV.CN 是 CNNIC 保留的功能性二级域名…" **0ms** |
| `edu.cn` (Education) | ● 正常 (showing www.edu.cn data!) | ● 保留域名 + "EDU.CN 是 CNNIC 保留的功能性二级域名…" **0ms** |
| `nic.cn` (CNNIC system) | ● 已注册 + "no WHOIS" fallback | ● 保留域名 + "nic.cn 为 CNNIC 系统保留域名…" **0ms** |
| `google.cn` (normal domain) | ● 正常 ✓ | ● 正常 ✓ (no false positive) |

All 43 reserved SLDs now return the correct badge and description in **0ms** with no WHOIS/RDAP network query.

---

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
