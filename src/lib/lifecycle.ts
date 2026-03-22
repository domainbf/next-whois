/**
 * TLD lifecycle (grace / redemption / pending-delete) data.
 * Used by both the frontend dialog and the backend cron processor.
 *
 * Phase reminder special `days_before` keys stored in reminder_logs:
 *   GRACE_KEY        = -1
 *   REDEMPTION_KEY   = -2
 *   PENDING_KEY      = -3
 */

export const GRACE_KEY = -1;
export const REDEMPTION_KEY = -2;
export const PENDING_KEY = -3;

export interface TldLifecycle {
  /** Days of grace period after expiry (0 = no grace) */
  grace: number;
  /** Days of redemption period after grace ends (0 = no redemption) */
  redemption: number;
  /** Days of pending-delete period after redemption ends (0 = no pending-delete) */
  pendingDelete: number;
  /** Human-readable registry name (optional) */
  registry?: string;
}

/**
 * Comprehensive gTLD + ccTLD lifecycle table.
 * Sources: ICANN, registry-specific policies.
 * For unknown TLDs the DEFAULT_LIFECYCLE applies.
 */
export const LIFECYCLE_TABLE: Record<string, TldLifecycle> = {
  // ── gTLD – standard ICANN (45/30/5) ──────────────────────────────────────
  com:    { grace: 45, redemption: 30, pendingDelete: 5, registry: "Verisign" },
  net:    { grace: 45, redemption: 30, pendingDelete: 5, registry: "Verisign" },
  org:    { grace: 45, redemption: 30, pendingDelete: 5, registry: "PIR" },
  info:   { grace: 45, redemption: 30, pendingDelete: 5, registry: "Afilias" },
  biz:    { grace: 45, redemption: 30, pendingDelete: 5, registry: "Neustar" },
  name:   { grace: 45, redemption: 30, pendingDelete: 5, registry: "Verisign" },
  mobi:   { grace: 45, redemption: 30, pendingDelete: 5, registry: "GSMA" },
  tel:    { grace: 45, redemption: 30, pendingDelete: 5, registry: "Telnic" },
  us:     { grace: 45, redemption: 30, pendingDelete: 5, registry: "Neustar" },
  co:     { grace: 45, redemption: 30, pendingDelete: 5, registry: "GoDaddy" },
  // new gTLD – also follow ICANN standard
  app:    { grace: 45, redemption: 30, pendingDelete: 5, registry: "Google" },
  dev:    { grace: 45, redemption: 30, pendingDelete: 5, registry: "Google" },
  web:    { grace: 45, redemption: 30, pendingDelete: 5 },
  shop:   { grace: 45, redemption: 30, pendingDelete: 5 },
  blog:   { grace: 45, redemption: 30, pendingDelete: 5 },
  cloud:  { grace: 45, redemption: 30, pendingDelete: 5 },
  tech:   { grace: 45, redemption: 30, pendingDelete: 5 },
  online: { grace: 45, redemption: 30, pendingDelete: 5 },
  site:   { grace: 45, redemption: 30, pendingDelete: 5 },
  store:  { grace: 45, redemption: 30, pendingDelete: 5 },
  live:   { grace: 45, redemption: 30, pendingDelete: 5 },
  link:   { grace: 45, redemption: 30, pendingDelete: 5 },
  media:  { grace: 45, redemption: 30, pendingDelete: 5 },
  news:   { grace: 45, redemption: 30, pendingDelete: 5 },
  email:  { grace: 45, redemption: 30, pendingDelete: 5 },
  space:  { grace: 45, redemption: 30, pendingDelete: 5 },
  world:  { grace: 45, redemption: 30, pendingDelete: 5 },
  // popular ccTLD-style gTLDs with shorter grace
  io:     { grace: 30, redemption: 30, pendingDelete: 5, registry: "Identity Digital" },
  ai:     { grace: 30, redemption: 30, pendingDelete: 5, registry: "Anguilla" },
  // ── ccTLD ─────────────────────────────────────────────────────────────────
  // China
  cn:     { grace: 0,  redemption: 30, pendingDelete: 5,  registry: "CNNIC" },
  // United Kingdom – 90-day auto-renewal window, then deleted (no redemption)
  uk:     { grace: 92, redemption: 0,  pendingDelete: 0,  registry: "Nominet" },
  "co.uk": { grace: 92, redemption: 0, pendingDelete: 0,  registry: "Nominet" },
  // Germany – deleted immediately on expiry
  de:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "DENIC" },
  // France – no grace, 30-day restore, 10-day pending
  fr:     { grace: 0,  redemption: 30, pendingDelete: 10, registry: "AFNIC" },
  // Japan – deleted immediately
  jp:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "JPRS" },
  // Australia – deleted immediately (5-day pending delete only)
  au:     { grace: 0,  redemption: 0,  pendingDelete: 5,  registry: "auDA" },
  // Canada
  ca:     { grace: 40, redemption: 30, pendingDelete: 5,  registry: "CIRA" },
  // India
  in:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "NIXI" },
  // Brazil – deleted almost immediately
  br:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "Registro.br" },
  // Russia
  ru:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "RIPN" },
  su:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "RIPN" },
  // Netherlands – 40-day grace, then deleted
  nl:     { grace: 40, redemption: 0,  pendingDelete: 0,  registry: "SIDN" },
  // Spain – deleted immediately
  es:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "Red.es" },
  // Italy – deleted immediately
  it:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "Registro.it" },
  // Poland – deleted immediately
  pl:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "NASK" },
  // Sweden – deleted immediately
  se:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "IIS" },
  // Norway – deleted immediately
  no:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "Norid" },
  // Finland – deleted immediately
  fi:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "Traficom" },
  // Denmark – deleted immediately
  dk:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "DK Hostmaster" },
  // Taiwan – no grace, 30-day redemption
  tw:     { grace: 0,  redemption: 30, pendingDelete: 5,  registry: "TWNIC" },
  // Hong Kong – no grace, 30-day redemption
  hk:     { grace: 0,  redemption: 30, pendingDelete: 5,  registry: "HKIRC" },
  // Singapore
  sg:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "SGNIC" },
  // New Zealand – deleted immediately
  nz:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "InternetNZ" },
  // South Africa – deleted immediately
  za:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "ZADNA" },
  // Mexico
  mx:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "NIC Mexico" },
  // Argentina – deleted immediately
  ar:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "NIC Argentina" },
  // South Korea
  kr:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "KISA" },
  // Switzerland – 30-day grace, 30-day redemption
  ch:     { grace: 30, redemption: 0,  pendingDelete: 5,  registry: "SWITCH" },
  // Belgium
  be:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "DNS Belgium" },
  // Portugal
  pt:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "DNS.PT" },
  // Czech Republic
  cz:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "CZ.NIC" },
  // Hungary
  hu:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ISZT" },
  // Romania
  ro:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "RoTLD" },
  // Ukraine
  ua:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "HOSTMASTER" },
  // Turkey
  tr:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "NIC TR" },
  // Thailand
  th:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "THNIC" },
  // Indonesia
  id:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "PANDI" },
  // Malaysia
  my:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "MYNIC" },
  // Philippines
  ph:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "PH" },
  // Vietnam
  vn:     { grace: 0,  redemption: 30, pendingDelete: 0,  registry: "VNNIC" },
  // Israel
  il:     { grace: 60, redemption: 0,  pendingDelete: 0,  registry: "ISOC-IL" },
};

export const DEFAULT_LIFECYCLE: TldLifecycle = {
  grace: 45,
  redemption: 30,
  pendingDelete: 5,
};

/** Get lifecycle config for a domain (by TLD). */
export function getTldLifecycle(domain: string): TldLifecycle {
  const tld = domain.split(".").pop()?.toLowerCase() ?? "";
  return LIFECYCLE_TABLE[tld] ?? DEFAULT_LIFECYCLE;
}

export type LifecyclePhase = "active" | "grace" | "redemption" | "pendingDelete" | "dropped";

export interface LifecycleInfo {
  phase: LifecyclePhase;
  expiry: Date;
  graceEnd: Date;
  redemptionEnd: Date;
  dropDate: Date;
  cfg: TldLifecycle;
  tld: string;
  /** Days remaining until expiry (negative when past expiry) */
  daysToExpiry: number;
}

/** Compute the full lifecycle for a domain given its expiry date string. */
export function computeLifecycle(domain: string, expirationDate: string | null): LifecycleInfo | null {
  if (!expirationDate) return null;
  const expiry = new Date(expirationDate);
  if (isNaN(expiry.getTime())) return null;
  const tld = domain.split(".").pop()?.toLowerCase() ?? "";
  const cfg = LIFECYCLE_TABLE[tld] ?? DEFAULT_LIFECYCLE;
  const ms = (d: number) => d * 86_400_000;
  const graceEnd = new Date(expiry.getTime() + ms(cfg.grace));
  const redemptionEnd = new Date(graceEnd.getTime() + ms(cfg.redemption));
  const dropDate = new Date(redemptionEnd.getTime() + ms(cfg.pendingDelete));
  const now = new Date();
  let phase: LifecyclePhase;
  if (now < expiry) phase = "active";
  else if (now < graceEnd) phase = "grace";
  else if (now < redemptionEnd) phase = "redemption";
  else if (now < dropDate) phase = "pendingDelete";
  else phase = "dropped";
  const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
  return { phase, expiry, graceEnd, redemptionEnd, dropDate, cfg, tld, daysToExpiry };
}

/** Fmt a Date to readable zh-CN date string. */
export function fmtDate(d: Date): string {
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export const PHASE_META = {
  active:       { zh: "正常有效", en: "Active",        color: "#059669", bg: "#ecfdf5" },
  grace:        { zh: "宽限期",   en: "Grace Period",  color: "#d97706", bg: "#fffbeb" },
  redemption:   { zh: "赎回期",   en: "Redemption",    color: "#ea580c", bg: "#fff7ed" },
  pendingDelete:{ zh: "待删除",   en: "Pending Delete",color: "#dc2626", bg: "#fef2f2" },
  dropped:      { zh: "已释放",   en: "Available",     color: "#6b7280", bg: "#f9fafb" },
} as const;
