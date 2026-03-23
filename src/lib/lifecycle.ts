/**
 * TLD lifecycle (grace / redemption / pending-delete) data.
 * Used by both the frontend dialog and the backend cron processor.
 *
 * Phase reminder special `days_before` keys stored in reminder_logs:
 *   GRACE_KEY        = -1
 *   REDEMPTION_KEY   = -2
 *   PENDING_KEY      = -3
 *
 * Phase detection priority:
 *   1. Live EPP status codes from WHOIS/RDAP  (most accurate)
 *   2. Date arithmetic against expiry + TLD table  (fallback)
 *
 * Sources:
 *   ICANN RAA (gTLD standard: grace 45d / RGP 30d / pendingDelete 5d)
 *   Namecheap KB: https://www.namecheap.com/support/knowledgebase/article.aspx/9916/2207/tlds-grace-periods
 *   Dynadot TLD list: https://www.dynadot.com/domain/tlds.html
 *   Registry policy pages (CNNIC, HKIRC, Nominet, AFNIC, DENIC, auDA …)
 *   IANA root-zone database
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
  /** Human-readable registry / authority name */
  registry?: string;
  /** Data confidence: "high" = verified from registry docs, "est" = estimated */
  confidence?: "high" | "est";
}

// ─────────────────────────────────────────────────────────────────────────────
// Named presets — reuse these for common registry policy families
// ─────────────────────────────────────────────────────────────────────────────

/** Standard ICANN gTLD lifecycle (RAA-mandated).  Used as default for all unknown gTLDs. */
const STD: TldLifecycle = { grace: 45, redemption: 30, pendingDelete: 5, confidence: "high" };

/** AFNIC-managed ccTLDs (.fr, .re, .pm, .tf, .wf, .yt, .nc, .pf, .gp, .mq …) */
const AFNIC: TldLifecycle = { grace: 0, redemption: 30, pendingDelete: 10, registry: "AFNIC", confidence: "high" };

/** Immediate-delete ccTLDs (DENIC-style): no grace, no redemption, no pendingDelete */
const IMMEDIATE: TldLifecycle = { grace: 0, redemption: 0, pendingDelete: 0, confidence: "high" };

/** Nominet-style (UK): 92-day total renewal window, no separate RGP, no pendingDelete */
const NOMINET: TldLifecycle = { grace: 92, redemption: 0, pendingDelete: 0, registry: "Nominet", confidence: "high" };

/** CNNIC (.cn and its second-level variants): no registry grace, 14-day RGP, 5-day pendingDelete */
const CNNIC: TldLifecycle = { grace: 0, redemption: 14, pendingDelete: 5, registry: "CNNIC", confidence: "high" };

/** HKIRC (.hk and its second-level variants): 90-day renewal grace, no RGP, no pendingDelete */
const HKIRC: TldLifecycle = { grace: 90, redemption: 0, pendingDelete: 0, registry: "HKIRC", confidence: "high" };

/** Registro.br (.br and sub-TLDs): immediate, no grace/redemption/pendingDelete */
const REGISTROBR: TldLifecycle = { grace: 0, redemption: 0, pendingDelete: 0, registry: "Registro.br", confidence: "high" };

/** NIC Argentina (.ar and sub-TLDs): immediate deletion */
const NICAR: TldLifecycle = { ...IMMEDIATE, registry: "NIC Argentina" };

/** JPRS (.jp and sub-TLDs): immediate deletion */
const JPRS: TldLifecycle = { ...IMMEDIATE, registry: "JPRS" };

/**
 * Comprehensive gTLD + ccTLD lifecycle table.
 * 300+ entries covering major TLDs worldwide.
 *
 * Accuracy notes:
 *  - .cn: CNNIC RGP is 14 days (registry-level), no registry grace period.
 *  - .hk: HKIRC has 90-day renewal window (no separate RGP in ICANN sense).
 *  - .ph: PH Domains Foundation — no redemption period.
 *  - .uk: Nominet 92-day total grace, no separate RGP or pendingDelete.
 *  - .de/.es/.it/.pl/.jp etc.: Immediate deletion by registry policy.
 *  - .fr/.re etc.: AFNIC — no grace, 30-day RGA (restore), 10-day pendingDelete.
 *  - .au (new 2022 TLD): auDA — grace 30d, no RGP, no pendingDelete.
 *  - com.au/net.au: auDA — grace 30d, RGP 30d, pendingDelete 5d.
 */
export const LIFECYCLE_TABLE: Record<string, TldLifecycle> = {

  // ── Tier-1 gTLDs ─────────────────────────────────────────────────────────
  com:    { ...STD, registry: "Verisign" },
  net:    { ...STD, registry: "Verisign" },
  org:    { ...STD, registry: "Public Interest Registry" },
  info:   { ...STD, registry: "Identity Digital" },
  biz:    { ...STD, registry: "Identity Digital" },
  name:   { ...STD, registry: "Verisign" },
  mobi:   { ...STD, registry: "Identity Digital" },
  tel:    { ...STD, registry: "Telnic" },
  us:     { ...STD, registry: "Neustar" },
  co:     { ...STD, registry: "GoDaddy" },
  pro:    { ...STD, registry: "Identity Digital" },
  jobs:   { ...STD, registry: "Employ Media" },
  travel: { ...STD, registry: "Donuts" },
  museum: { grace: 45, redemption: 30, pendingDelete: 5, registry: "MuseDoma", confidence: "high" },
  coop:   { ...STD, registry: "DotCooperation" },
  aero:   { ...STD, registry: "SITA" },
  int:    { grace: 45, redemption: 30, pendingDelete: 5, registry: "IANA", confidence: "high" },
  edu:    { grace: 45, redemption: 30, pendingDelete: 5, registry: "Educause", confidence: "high" },
  gov:    { grace: 45, redemption: 30, pendingDelete: 5, registry: "CISA", confidence: "high" },
  mil:    { grace: 45, redemption: 30, pendingDelete: 5, registry: "DoD", confidence: "high" },
  xxx:    { ...STD, registry: "ICM Registry" },
  post:   { ...STD, registry: "UPU" },
  cat:    { ...STD, registry: "Fundació puntCAT" },

  // ── Google / Squarespace new gTLDs ────────────────────────────────────────
  app:    { ...STD, registry: "Google" },
  dev:    { ...STD, registry: "Google" },
  page:   { ...STD, registry: "Google" },
  zip:    { ...STD, registry: "Google" },
  dad:    { ...STD, registry: "Google" },
  phd:    { ...STD, registry: "Google" },
  nexus:  { ...STD, registry: "Google" },
  web:    { ...STD, registry: "Identity Digital" },

  // ── Very popular new gTLDs ────────────────────────────────────────────────
  xyz:    { ...STD, registry: "XYZ.COM LLC" },
  club:   { ...STD, registry: ".CLUB Domains" },
  fun:    { ...STD, registry: "Radix" },
  icu:    { ...STD, registry: "ShortDot SA" },
  top:    { ...STD, registry: "Jiangsu Bangning Science" },
  vip:    { ...STD, registry: "Minds + Machines" },
  wiki:   { ...STD, registry: "Top Level Design" },
  ink:    { ...STD, registry: "Top Level Design" },
  buzz:   { ...STD, registry: "DOTSTRATEGY" },
  website:{ ...STD, registry: "Radix" },
  uno:    { ...STD, registry: "Dot Latin LLC" },
  bio:    { ...STD, registry: "Identity Digital" },
  ski:    { ...STD, registry: "Dot Ski" },
  ltd:    { ...STD, registry: "Namera Capital" },
  llc:    { ...STD, registry: "Dot Trademark" },
  srl:    { ...STD, registry: "InterNetX" },
  gmbh:   { ...STD, registry: "InterNetX" },
  inc:    { ...STD, registry: "Intercap Holdings" },
  bar:    { ...STD, registry: "Punto 2012 Sociedad Anonima" },
  fit:    { ...STD, registry: "Donuts" },
  fan:    { ...STD, registry: "Asiamix Digital" },
  bet:    { ...STD, registry: "Identity Digital" },
  best:   { ...STD, registry: "GoDaddy" },
  cash:   { ...STD, registry: "Donuts" },
  deal:   { ...STD, registry: "Amazon" },

  // ── Standard new gTLD — business & professional ───────────────────────────
  shop:        { ...STD },
  blog:        { ...STD },
  cloud:       { ...STD },
  tech:        { ...STD },
  online:      { ...STD },
  site:        { ...STD },
  store:       { ...STD },
  live:        { ...STD },
  link:        { ...STD },
  media:       { ...STD },
  news:        { ...STD },
  email:       { ...STD },
  space:       { ...STD },
  world:       { ...STD },
  work:        { ...STD },
  tools:       { ...STD },
  run:         { ...STD },
  team:        { ...STD },
  digital:     { ...STD },
  global:      { ...STD },
  network:     { ...STD },
  host:        { ...STD },
  studio:      { ...STD },
  design:      { ...STD },
  agency:      { ...STD },
  group:       { ...STD },
  plus:        { ...STD },
  guru:        { ...STD },
  expert:      { ...STD },
  solutions:   { ...STD },
  systems:     { ...STD },
  services:    { ...STD },
  support:     { ...STD },
  help:        { ...STD },
  guide:       { ...STD },
  review:      { ...STD },
  reviews:     { ...STD },
  social:      { ...STD },
  photos:      { ...STD },
  video:       { ...STD },
  audio:       { ...STD },
  music:       { ...STD },
  art:         { ...STD },
  gallery:     { ...STD },
  sale:        { ...STD },
  deals:       { ...STD },
  events:      { ...STD },
  fashion:     { ...STD },
  sport:       { ...STD },
  health:      { ...STD },
  care:        { ...STD },
  yoga:        { ...STD },
  finance:     { ...STD },
  money:       { ...STD },
  fund:        { ...STD },
  capital:     { ...STD },
  bank:        { ...STD, registry: "SWIFT" },
  law:         { ...STD },
  legal:       { ...STD },
  academy:     { ...STD },
  accountant:  { ...STD },
  accountants: { ...STD },
  actor:       { ...STD },
  adult:       { ...STD },
  apartments:  { ...STD },
  associates:  { ...STD },
  auction:     { ...STD },
  bargains:    { ...STD },
  bike:        { ...STD },
  bingo:       { ...STD },
  black:       { ...STD },
  blue:        { ...STD },
  boutique:    { ...STD },
  builders:    { ...STD },
  cab:         { ...STD },
  cafe:        { ...STD },
  camera:      { ...STD },
  camp:        { ...STD },
  careers:     { ...STD },
  casino:      { ...STD },
  catering:    { ...STD },
  center:      { ...STD },
  chat:        { ...STD },
  cheap:       { ...STD },
  church:      { ...STD },
  city:        { ...STD },
  claims:      { ...STD },
  cleaning:    { ...STD },
  clinic:      { ...STD },
  clothing:    { ...STD },
  coach:       { ...STD },
  codes:       { ...STD },
  coffee:      { ...STD },
  college:     { ...STD },
  community:   { ...STD },
  company:     { ...STD },
  computer:    { ...STD },
  condos:      { ...STD },
  construction:{ ...STD },
  consulting:  { ...STD },
  contractors: { ...STD },
  cooking:     { ...STD },
  coupons:     { ...STD },
  credit:      { ...STD },
  dance:       { ...STD },
  dating:      { ...STD },
  delivery:    { ...STD },
  dental:      { ...STD },
  diamonds:    { ...STD },
  direct:      { ...STD },
  directory:   { ...STD },
  discount:    { ...STD },
  doctor:      { ...STD },
  dog:         { ...STD },
  earth:       { ...STD },
  energy:      { ...STD },
  engineering: { ...STD },
  enterprises: { ...STD },
  equipment:   { ...STD },
  estate:      { ...STD },
  exchange:    { ...STD },
  exposed:     { ...STD },
  express:     { ...STD },
  fail:        { ...STD },
  farm:        { ...STD },
  financial:   { ...STD },
  fitness:     { ...STD },
  flights:     { ...STD },
  florist:     { ...STD },
  foundation:  { ...STD },
  furniture:   { ...STD },
  games:       { ...STD },
  glass:       { ...STD },
  gold:        { ...STD },
  golf:        { ...STD },
  graphics:    { ...STD },
  green:       { ...STD },
  gripe:       { ...STD },
  guitars:     { ...STD },
  haus:        { ...STD },
  healthcare:  { ...STD },
  hockey:      { ...STD },
  homes:       { ...STD },
  horse:       { ...STD },
  house:       { ...STD },
  immo:        { ...STD },
  immobilien:  { ...STD },
  industries:  { ...STD },
  institute:   { ...STD },
  insure:      { ...STD },
  international:{ ...STD },
  investments: { ...STD },
  jetzt:       { ...STD },
  kitchen:     { ...STD },
  land:        { ...STD },
  lease:       { ...STD },
  lighting:    { ...STD },
  limited:     { ...STD },
  limo:        { ...STD },
  loans:       { ...STD },
  maison:      { ...STD },
  management:  { ...STD },
  marketing:   { ...STD },
  mba:         { ...STD },
  memorial:    { ...STD },
  moda:        { ...STD },
  mortgage:    { ...STD },
  movie:       { ...STD },
  ninja:       { ...STD },
  partners:    { ...STD },
  parts:       { ...STD },
  pet:         { ...STD },
  photography: { ...STD },
  pics:        { ...STD },
  pizza:       { ...STD },
  place:       { ...STD },
  plumbing:    { ...STD },
  press:       { ...STD },
  productions: { ...STD },
  properties:  { ...STD },
  property:    { ...STD },
  pub:         { ...STD },
  racing:      { ...STD },
  radio:       { ...STD },
  realty:      { ...STD },
  recipes:     { ...STD },
  rehab:       { ...STD },
  rentals:     { ...STD },
  repair:      { ...STD },
  report:      { ...STD },
  republican:  { ...STD },
  rest:        { ...STD },
  restaurant:  { ...STD },
  rocks:       { ...STD },
  rodeo:       { ...STD },
  rugby:       { ...STD },
  schule:      { ...STD },
  school:      { ...STD },
  security:    { ...STD },
  sexy:        { ...STD },
  shoes:       { ...STD },
  singles:     { ...STD },
  solar:       { ...STD },
  soy:         { ...STD },
  supplies:    { ...STD },
  supply:      { ...STD },
  surgery:     { ...STD },
  tax:         { ...STD },
  taxi:        { ...STD },
  technology:  { ...STD },
  tennis:      { ...STD },
  tips:        { ...STD },
  tires:       { ...STD },
  today:       { ...STD },
  tours:       { ...STD },
  town:        { ...STD },
  toys:        { ...STD },
  trade:       { ...STD },
  training:    { ...STD },
  university:  { ...STD },
  vacations:   { ...STD },
  ventures:    { ...STD },
  villas:      { ...STD },
  vision:      { ...STD },
  voyage:      { ...STD },
  wine:        { ...STD },
  works:       { ...STD },
  wtf:         { ...STD },
  zone:        { ...STD },

  // ── Geographic / city new gTLDs (all standard ICANN) ──────────────────────
  amsterdam:   { ...STD, registry: "Gemeente Amsterdam" },
  barcelona:   { ...STD, registry: "Fundació puntBCN" },
  berlin:      { ...STD, registry: "dotBERLIN GmbH" },
  brussels:    { ...STD, registry: "DNS.be" },
  capetown:    { ...STD, registry: "ZA Central Registry" },
  cologne:     { ...STD, registry: "dotKoeln GmbH" },
  koeln:       { ...STD, registry: "dotKoeln GmbH" },
  dubai:       { ...STD, registry: "Dubai DED" },
  istanbul:    { ...STD, registry: "Istanbul Metropolitan Municipality" },
  london:      { ...STD, registry: "Dot London Domains" },
  miami:       { ...STD, registry: "Minds + Machines" },
  moscow:      { ...STD, registry: "Foundation for Assistance" },
  nagoya:      { ...STD, registry: "GMO Registry" },
  nyc:         { ...STD, registry: "The City of New York" },
  okinawa:     { ...STD, registry: "BusinessRalliart" },
  osaka:       { ...STD, registry: "Interlink" },
  paris:       { ...STD, registry: "City of Paris" },
  quebec:      { ...STD, registry: "PointQuébec" },
  rio:         { ...STD, registry: "Empresa Municipal" },
  ryukyu:      { ...STD, registry: "BusinessRalliart" },
  saarland:    { ...STD, registry: "dotSaarland GmbH" },
  tirol:       { ...STD, registry: "punkt Tirol GmbH" },
  tokyo:       { ...STD, registry: "GMO Registry" },
  vegas:       { ...STD, registry: "Dot Vegas, Inc." },
  wien:        { ...STD, registry: "punkt.wien GmbH" },
  yokohama:    { ...STD, registry: "GMO Registry" },
  zuerich:     { ...STD, registry: "Kanton Zürich" },
  boston:      { ...STD, registry: "Minds + Machines" },
  wales:       { ...STD, registry: "Nominet" },
  scot:        { ...STD, registry: "dot.Scot Registry" },
  irish:       { ...STD, registry: "Dot-Irish" },
  africa:      { ...STD, registry: "ZA Central Registry" },
  arab:        { ...STD, registry: "League of Arab States" },
  asia:        { ...STD, registry: "DotAsia Organisation" },
  nrw:         { ...STD, registry: "dotNRW GmbH" },

  // ── ccTLD-origin domains widely used as generic ───────────────────────────
  io:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "Identity Digital (BIOT)", confidence: "high" },
  ai:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "Anguilla NIC", confidence: "high" },
  gg:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Island Networks (Guernsey)", confidence: "est" },
  je:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Island Networks (Jersey)", confidence: "est" },
  la:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "NIC Laos", confidence: "est" },
  cc:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "VeriSign (Cocos Islands)", confidence: "high" },
  tv:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "VeriSign (Tuvalu)", confidence: "high" },
  ws:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Samoa NIC", confidence: "est" },
  me:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "doMEn (Montenegro)", confidence: "high" },
  ac:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Internet Computer Bureau (Ascension)", confidence: "est" },
  sh:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Internet Computer Bureau (St Helena)", confidence: "est" },
  cx:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Christmas Island NIC", confidence: "est" },
  nu:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Nunames (Niue)", confidence: "est" },
  pw:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Afilias (Palau)", confidence: "est" },
  sc:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "VCS (Seychelles)", confidence: "est" },
  mn:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "MongolNET", confidence: "est" },
  fm:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "FSM Telecom", confidence: "est" },
  gl:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "TELE Greenland", confidence: "est" },
  vc:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "VINNIC (St Vincent)", confidence: "est" },
  ms:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "MNI Networks (Montserrat)", confidence: "est" },
  gs:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Island Networks", confidence: "est" },
  ag:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "UHSA (Antigua)", confidence: "est" },
  lc:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "NATCOM (St Lucia)", confidence: "est" },
  to:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Tonga Network Info Center", confidence: "est" },
  vg:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "JADA (British Virgin Islands)", confidence: "est" },
  vi:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "US VI NIC", confidence: "est" },
  pr:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Puerto Rico NIC", confidence: "est" },
  tk:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Dot TK (Tokelau)", confidence: "est" },
  ml:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "SOTELMA (Mali)", confidence: "est" },
  ga:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Gabon NIC", confidence: "est" },
  cf:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "CAF NIC (Cent. Africa)", confidence: "est" },

  // ── Asia-Pacific ccTLD ────────────────────────────────────────────────────
  // .cn: CNNIC RGP is 14 days (no registry grace; pendingDelete 5 days)
  cn:     { ...CNNIC },
  // .tw: TWNIC — 0 grace, 30-day redemption, 5-day pendingDelete
  tw:     { grace: 0,  redemption: 30, pendingDelete: 5,  registry: "TWNIC",  confidence: "high" },
  // .hk: HKIRC — 90-day renewal grace window, no separate RGP
  hk:     { ...HKIRC },
  mo:     { grace: 0,  redemption: 30, pendingDelete: 5,  registry: "MONIC (Macau)", confidence: "est" },
  jp:     { ...JPRS },
  kr:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "KISA",   confidence: "high" },
  sg:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "SGNIC",  confidence: "high" },
  my:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "MYNIC",  confidence: "high" },
  // .ph: PH Domains Foundation — no redemption period
  ph:     { grace: 30, redemption: 0,  pendingDelete: 5,  registry: "PH Domains", confidence: "high" },
  id:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "PANDI",  confidence: "high" },
  vn:     { grace: 0,  redemption: 30, pendingDelete: 0,  registry: "VNNIC",  confidence: "high" },
  th:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "THNIC",  confidence: "high" },
  mm:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Myanmar NIC", confidence: "est" },
  kh:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NiC.KH", confidence: "est" },
  bn:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "BNNIC",  confidence: "est" },
  tl:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC.TL (Timor-Leste)", confidence: "est" },
  // .au: new top-level .au (launched 2022) — auDA 30-day grace, no separate RGP
  au:     { grace: 30, redemption: 0,  pendingDelete: 5,  registry: "auDA",   confidence: "high" },
  nz:     { ...IMMEDIATE,                                  registry: "InternetNZ" },
  in:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "NIXI",   confidence: "high" },
  pk:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "PKNIC",  confidence: "est" },
  bd:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "BTCL",   confidence: "est" },
  lk:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "LK Domain Registry", confidence: "est" },
  np:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Mercantile",   confidence: "est" },
  ir:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "IRNIC",  confidence: "est" },
  iq:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC.iq",  confidence: "est" },
  il:     { grace: 60, redemption: 0,  pendingDelete: 0,  registry: "ISOC-IL", confidence: "high" },
  ae:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "aeDA",   confidence: "high" },
  sa:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "SaudiNIC", confidence: "est" },
  kw:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "CITRA (Kuwait)", confidence: "est" },
  om:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "TRA (Oman)", confidence: "est" },
  qa:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ictQATAR", confidence: "est" },
  jo:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NITC (Jordan)", confidence: "est" },
  lb:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "OGERO (Lebanon)", confidence: "est" },
  ye:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "TeleYemen", confidence: "est" },
  sy:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "SCS-NET (Syria)", confidence: "est" },
  ps:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "PNINA (Palestine)", confidence: "est" },
  fj:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "University of S. Pacific (Fiji)", confidence: "est" },
  pg:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Papua New Guinea NIC", confidence: "est" },
  sb:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Solomon Islands NIC", confidence: "est" },
  vu:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "VANUATU NIC", confidence: "est" },
  ki:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Kiribati NIC", confidence: "est" },
  nr:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Cenpac.net.nr (Nauru)", confidence: "est" },
  ck:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Telecom Cook Islands", confidence: "est" },
  wf:     { ...AFNIC },
  pf:     { ...AFNIC,  registry: "AFNIC (French Polynesia)" },
  nc:     { ...AFNIC,  registry: "AFNIC (New Caledonia)" },
  as:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "AS NIC (American Samoa)", confidence: "est" },

  // ── Europe ccTLD ──────────────────────────────────────────────────────────
  uk:     { ...NOMINET },
  de:     { ...IMMEDIATE,                                  registry: "DENIC"  },
  fr:     { ...AFNIC },
  pm:     { ...AFNIC },
  re:     { ...AFNIC },
  tf:     { ...AFNIC },
  yt:     { ...AFNIC },
  gp:     { ...AFNIC,  registry: "AFNIC (Guadeloupe)" },
  mq:     { ...AFNIC,  registry: "AFNIC (Martinique)" },
  nl:     { grace: 40, redemption: 0,  pendingDelete: 0,  registry: "SIDN",   confidence: "high" },
  eu:     { grace: 40, redemption: 0,  pendingDelete: 0,  registry: "EURid",  confidence: "high" },
  es:     { ...IMMEDIATE,                                  registry: "Red.es"  },
  it:     { ...IMMEDIATE,                                  registry: "Registro.it" },
  pl:     { ...IMMEDIATE,                                  registry: "NASK"    },
  se:     { ...IMMEDIATE,                                  registry: "IIS"     },
  no:     { ...IMMEDIATE,                                  registry: "Norid"   },
  fi:     { ...IMMEDIATE,                                  registry: "Traficom" },
  dk:     { ...IMMEDIATE,                                  registry: "DK Hostmaster" },
  be:     { ...IMMEDIATE,                                  registry: "DNS Belgium" },
  at:     { ...IMMEDIATE,                                  registry: "nic.at"  },
  ch:     { grace: 30, redemption: 0,  pendingDelete: 5,  registry: "SWITCH", confidence: "high" },
  li:     { grace: 30, redemption: 0,  pendingDelete: 5,  registry: "SWITCH (Liechtenstein)", confidence: "high" },
  pt:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "DNS.PT", confidence: "high" },
  ie:     { ...IMMEDIATE,                                  registry: "IEDR"    },
  is:     { ...IMMEDIATE,                                  registry: "ISNIC"   },
  cz:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "CZ.NIC", confidence: "high" },
  sk:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "SK-NIC", confidence: "est" },
  hu:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ISZT",   confidence: "est" },
  ro:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "RoTLD",  confidence: "est" },
  bg:     { grace: 30, redemption: 0,  pendingDelete: 5,  registry: "Register.BG", confidence: "est" },
  hr:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "CARNet", confidence: "est" },
  si:     { ...IMMEDIATE,                                  registry: "ARNES"   },
  rs:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "RNIDS (Serbia)", confidence: "est" },
  ba:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "UTIC (Bosnia)", confidence: "est" },
  mk:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "MARnet (N.Macedonia)", confidence: "est" },
  al:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "AKEP (Albania)", confidence: "est" },
  gr:     { grace: 30, redemption: 0,  pendingDelete: 5,  registry: "ICS.FORTH (Greece)", confidence: "est" },
  cy:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "CYNIC",  confidence: "est" },
  mt:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC.mt", confidence: "est" },
  lu:     { grace: 30, redemption: 0,  pendingDelete: 5,  registry: "RESTENA (Luxembourg)", confidence: "est" },
  lt:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "DOMREG.lt", confidence: "est" },
  lv:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "NIC.lv (Latvia)", confidence: "est" },
  ee:     { ...IMMEDIATE,                                  registry: "EENet (Estonia)" },
  md:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "MoldData", confidence: "est" },
  by:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "HOSTER.BY", confidence: "est" },
  ua:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "HOSTMASTER.UA", confidence: "est" },
  ru:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "RIPN",   confidence: "high" },
  su:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "RIPN",   confidence: "high" },
  kz:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "KAZDOMAIN", confidence: "est" },
  uz:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "UzNIC",  confidence: "est" },
  kg:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "TDDKK (Kyrgyzstan)", confidence: "est" },
  tj:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "TLD.tj (Tajikistan)", confidence: "est" },
  tm:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC.TM (Turkmenistan)", confidence: "est" },
  az:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "AZNIC (Azerbaijan)", confidence: "est" },
  ge:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC.ge (Georgia)", confidence: "est" },
  am:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "AMNIC (Armenia)", confidence: "est" },
  tr:     { ...IMMEDIATE,                                  registry: "NIC TR"  },
  fo:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Faroese NIC", confidence: "est" },
  mc:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Monaco", confidence: "est" },
  sm:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Sec. of State (San Marino)", confidence: "est" },
  ad:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Andorra Telecom", confidence: "est" },
  gi:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Sapphire Networks (Gibraltar)", confidence: "est" },
  im:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "Domicilium (Isle of Man)", confidence: "est" },
  xk:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "IKOSOVA (Kosovo)", confidence: "est" },

  // ── Americas ccTLD ────────────────────────────────────────────────────────
  ca:     { grace: 40, redemption: 30, pendingDelete: 5,  registry: "CIRA",   confidence: "high" },
  br:     { ...REGISTROBR },
  mx:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "NIC México", confidence: "high" },
  ar:     { ...NICAR },
  cl:     { ...IMMEDIATE,                                  registry: "NIC Chile" },
  pe:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "NIC Peru", confidence: "est" },
  ec:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC.ec (Ecuador)", confidence: "est" },
  bo:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ADSIB (Bolivia)", confidence: "est" },
  py:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC.PY (Paraguay)", confidence: "est" },
  uy:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ANTEL (Uruguay)", confidence: "est" },
  ve:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Venezuela", confidence: "est" },
  cr:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Costa Rica", confidence: "est" },
  gt:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "UVG (Guatemala)", confidence: "est" },
  hn:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "AHL (Honduras)", confidence: "est" },
  ni:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "UNI-NIC (Nicaragua)", confidence: "est" },
  sv:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "SVNET (El Salvador)", confidence: "est" },
  pa:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Panama", confidence: "est" },
  do:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "INDOTEL (Dominican Republic)", confidence: "est" },
  cu:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "MINCOM (Cuba)", confidence: "est" },
  ht:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "CONATEL (Haiti)", confidence: "est" },
  jm:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NICT (Jamaica)", confidence: "est" },
  tt:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "TTNIC (Trinidad)", confidence: "est" },
  gd:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "MHC (Grenada)", confidence: "est" },
  dm:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "DM Registry (Dominica)", confidence: "est" },
  bb:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Barbados NIC", confidence: "est" },
  ky:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ICTA (Cayman Islands)", confidence: "est" },
  bm:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Bermuda NIC", confidence: "est" },
  bs:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "BNICA (Bahamas)", confidence: "est" },
  tc:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "MHC (Turks & Caicos)", confidence: "est" },
  kn:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "MHC (St Kitts)", confidence: "est" },
  fk:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Falkland Islands NIC", confidence: "est" },
  sr:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Parbo NIC (Suriname)", confidence: "est" },
  aw:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "SETAR (Aruba)", confidence: "est" },
  cw:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "UoNA (Curaçao)", confidence: "est" },
  sx:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "SX Registry (Sint Maarten)", confidence: "est" },

  // ── Africa / Middle-East ccTLD ────────────────────────────────────────────
  za:     { ...IMMEDIATE,                                  registry: "ZADNA"   },
  ng:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "NIRA (Nigeria)", confidence: "est" },
  ke:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "KENIC (Kenya)", confidence: "est" },
  gh:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "NCA (Ghana)", confidence: "est" },
  tz:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "TZNIC (Tanzania)", confidence: "est" },
  ug:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "UIXP (Uganda)", confidence: "est" },
  rw:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "RICTA (Rwanda)", confidence: "est" },
  et:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "EthiopTelecom", confidence: "est" },
  eg:     { ...IMMEDIATE,                                  registry: "NTRA (Egypt)" },
  ma:     { ...IMMEDIATE,                                  registry: "ANRT (Morocco)" },
  tn:     { ...IMMEDIATE,                                  registry: "ATI (Tunisia)" },
  dz:     { ...IMMEDIATE,                                  registry: "ENIC (Algeria)" },
  ly:     { ...IMMEDIATE,                                  registry: "LYNIC (Libya)" },
  sd:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "SUDATEL (Sudan)", confidence: "est" },
  cm:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC-Cameroon", confidence: "est" },
  sn:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Senegal", confidence: "est" },
  ci:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC CI (Côte d'Ivoire)", confidence: "est" },
  mz:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC.mz (Mozambique)", confidence: "est" },
  zw:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "POTRAZ (Zimbabwe)", confidence: "est" },
  zm:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ZICTA (Zambia)", confidence: "est" },
  ao:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Angola NIC", confidence: "est" },
  bi:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Burundi", confidence: "est" },
  bj:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Bénin", confidence: "est" },
  bf:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ARCE (Burkina Faso)", confidence: "est" },
  td:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Chad", confidence: "est" },
  cg:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Congo", confidence: "est" },
  cd:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ICPTC (DR Congo)", confidence: "est" },
  gq:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Equatorial Guinea", confidence: "est" },
  gw:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Guinea-Bissau", confidence: "est" },
  mr:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Mauritania", confidence: "est" },
  ne:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Niger", confidence: "est" },
  tg:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Togo", confidence: "est" },
  bw:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "BOCRA (Botswana)", confidence: "est" },
  na:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NAN (Namibia)", confidence: "est" },
  ls:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "LNDC (Lesotho)", confidence: "est" },
  sz:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "SPTC (Eswatini)", confidence: "est" },
  mw:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Malawi NIC", confidence: "est" },
  mg:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Madagascar", confidence: "est" },
  mu:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ICTA (Mauritius)", confidence: "est" },
  km:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Comoros", confidence: "est" },
  so:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Somalia NIC", confidence: "est" },
  dj:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Djibouti", confidence: "est" },
  er:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Eritrea NIC", confidence: "est" },
  st:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC São Tomé", confidence: "est" },
  cv:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ANAC (Cabo Verde)", confidence: "est" },
  gn:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Guinea", confidence: "est" },
  sl:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "SIERRATEL (Sierra Leone)", confidence: "est" },
  lr:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Liberia", confidence: "est" },
  gmb:    { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Gambia", confidence: "est" },

  // ── Selected second-level domain (SLD) overrides ─────────────────────────

  // --- UK (Nominet) ---
  "co.uk":   { ...NOMINET },
  "org.uk":  { ...NOMINET },
  "me.uk":   { ...NOMINET },
  "net.uk":  { ...NOMINET },
  "ltd.uk":  { ...NOMINET },
  "plc.uk":  { ...NOMINET },

  // --- Australia (auDA) — com/net/org.au use 30-day grace + 30-day RGP ---
  "com.au":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "auDA",   confidence: "high" },
  "net.au":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "auDA",   confidence: "high" },
  "org.au":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "auDA",   confidence: "high" },
  "id.au":   { grace: 30, redemption: 30, pendingDelete: 5, registry: "auDA",   confidence: "est" },
  "asn.au":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "auDA",   confidence: "est" },
  "edu.au":  { grace: 0,  redemption: 0,  pendingDelete: 0, registry: "auDA",   confidence: "high" },
  "gov.au":  { grace: 0,  redemption: 0,  pendingDelete: 0, registry: "auDA",   confidence: "high" },

  // --- China (CNNIC) ---
  "com.cn":  { ...CNNIC },
  "net.cn":  { ...CNNIC },
  "org.cn":  { ...CNNIC },

  // --- Taiwan (TWNIC) ---
  "com.tw":  { grace: 0,  redemption: 30, pendingDelete: 5, registry: "TWNIC",  confidence: "est" },
  "net.tw":  { grace: 0,  redemption: 30, pendingDelete: 5, registry: "TWNIC",  confidence: "est" },
  "org.tw":  { grace: 0,  redemption: 30, pendingDelete: 5, registry: "TWNIC",  confidence: "est" },
  "idv.tw":  { grace: 0,  redemption: 30, pendingDelete: 5, registry: "TWNIC",  confidence: "est" },
  "edu.tw":  { grace: 0,  redemption: 30, pendingDelete: 5, registry: "TWNIC",  confidence: "est" },
  "gov.tw":  { grace: 0,  redemption: 30, pendingDelete: 5, registry: "TWNIC",  confidence: "est" },

  // --- Hong Kong (HKIRC) — no redemption, 90-day grace ---
  "com.hk":  { ...HKIRC },
  "net.hk":  { ...HKIRC },
  "org.hk":  { ...HKIRC },
  "idv.hk":  { ...HKIRC },
  "edu.hk":  { ...HKIRC },
  "gov.hk":  { ...HKIRC },

  // --- New Zealand (InternetNZ) ---
  "co.nz":   { ...IMMEDIATE, registry: "InternetNZ" },
  "net.nz":  { ...IMMEDIATE, registry: "InternetNZ" },
  "org.nz":  { ...IMMEDIATE, registry: "InternetNZ" },
  "school.nz":{ ...IMMEDIATE, registry: "InternetNZ" },
  "govt.nz": { ...IMMEDIATE, registry: "InternetNZ" },

  // --- Japan (JPRS) ---
  "co.jp":   { ...JPRS },
  "or.jp":   { ...JPRS },
  "ne.jp":   { ...JPRS },
  "gr.jp":   { ...JPRS },
  "ac.jp":   { ...JPRS },
  "go.jp":   { ...JPRS },

  // --- Korea (KISA) ---
  "co.kr":   { grace: 30, redemption: 30, pendingDelete: 5, registry: "KISA",   confidence: "high" },
  "or.kr":   { grace: 30, redemption: 30, pendingDelete: 5, registry: "KISA",   confidence: "est" },

  // --- Singapore (SGNIC) ---
  "com.sg":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "SGNIC",  confidence: "est" },
  "net.sg":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "SGNIC",  confidence: "est" },
  "org.sg":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "SGNIC",  confidence: "est" },
  "edu.sg":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "SGNIC",  confidence: "est" },
  "gov.sg":  { grace: 0,  redemption: 0,  pendingDelete: 0, registry: "SGNIC",  confidence: "est" },

  // --- Malaysia (MYNIC) ---
  "com.my":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "MYNIC",  confidence: "est" },
  "net.my":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "MYNIC",  confidence: "est" },
  "org.my":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "MYNIC",  confidence: "est" },
  "edu.my":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "MYNIC",  confidence: "est" },

  // --- Philippines (PH Domains — no redemption) ---
  "com.ph":  { grace: 30, redemption: 0,  pendingDelete: 5, registry: "PH Domains", confidence: "est" },
  "net.ph":  { grace: 30, redemption: 0,  pendingDelete: 5, registry: "PH Domains", confidence: "est" },
  "org.ph":  { grace: 30, redemption: 0,  pendingDelete: 5, registry: "PH Domains", confidence: "est" },

  // --- India (NIXI) ---
  "co.in":   { grace: 30, redemption: 30, pendingDelete: 5, registry: "NIXI",   confidence: "est" },
  "net.in":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "NIXI",   confidence: "est" },
  "org.in":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "NIXI",   confidence: "est" },

  // --- Israel (ISOC-IL) ---
  "co.il":   { grace: 60, redemption: 0,  pendingDelete: 0, registry: "ISOC-IL", confidence: "est" },
  "org.il":  { grace: 60, redemption: 0,  pendingDelete: 0, registry: "ISOC-IL", confidence: "est" },
  "net.il":  { grace: 60, redemption: 0,  pendingDelete: 0, registry: "ISOC-IL", confidence: "est" },

  // --- South Africa (ZADNA) ---
  "co.za":   { ...IMMEDIATE, registry: "ZADNA" },
  "org.za":  { ...IMMEDIATE, registry: "ZADNA" },
  "net.za":  { ...IMMEDIATE, registry: "ZADNA" },
  "web.za":  { ...IMMEDIATE, registry: "ZADNA" },

  // --- Kenya (KENIC) ---
  "co.ke":   { grace: 30, redemption: 30, pendingDelete: 5, registry: "KENIC",  confidence: "est" },
  "or.ke":   { grace: 30, redemption: 30, pendingDelete: 5, registry: "KENIC",  confidence: "est" },
  "ne.ke":   { grace: 30, redemption: 30, pendingDelete: 5, registry: "KENIC",  confidence: "est" },

  // --- Nigeria (NIRA) ---
  "com.ng":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "NIRA (Nigeria)", confidence: "est" },
  "org.ng":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "NIRA (Nigeria)", confidence: "est" },
  "net.ng":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "NIRA (Nigeria)", confidence: "est" },

  // --- Brazil (Registro.br — immediate) ---
  "com.br":  { ...REGISTROBR },
  "net.br":  { ...REGISTROBR },
  "org.br":  { ...REGISTROBR },
  "edu.br":  { ...REGISTROBR },
  "gov.br":  { ...REGISTROBR },

  // --- Mexico (NIC México) ---
  "com.mx":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "NIC México", confidence: "high" },
  "org.mx":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "NIC México", confidence: "est" },
  "net.mx":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "NIC México", confidence: "est" },

  // --- Argentina (NIC Argentina — immediate) ---
  "com.ar":  { ...NICAR },
  "net.ar":  { ...NICAR },
  "org.ar":  { ...NICAR },

  // --- Colombia ---
  "com.co":  { grace: 45, redemption: 30, pendingDelete: 5, registry: "NIC Colombia", confidence: "est" },

  // --- Peru ---
  "com.pe":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "NIC Peru", confidence: "est" },

  // --- Ukraine ---
  "com.ua":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "HOSTMASTER.UA", confidence: "est" },

  // --- Turkey (NIC TR — immediate) ---
  "com.tr":  { ...IMMEDIATE, registry: "NIC TR" },
  "org.tr":  { ...IMMEDIATE, registry: "NIC TR" },
  "net.tr":  { ...IMMEDIATE, registry: "NIC TR" },

  // --- Venezuela ---
  "com.ve":  { grace: 30, redemption: 0,  pendingDelete: 0, registry: "NIC Venezuela", confidence: "est" },
};

export const DEFAULT_LIFECYCLE: TldLifecycle = {
  grace: 45,
  redemption: 30,
  pendingDelete: 5,
  confidence: "est",
};

/** Get lifecycle config for a domain (by TLD), with optional admin overrides applied first. */
export function getTldLifecycle(domain: string, overrides?: Record<string, TldLifecycle>): TldLifecycle {
  const parts = domain.toLowerCase().split(".");
  const tld = parts.pop() ?? "";
  // Check for two-level ccTLD (e.g., co.uk) — not common but handle
  const twoLevel = parts.length > 0 ? `${parts[parts.length - 1]}.${tld}` : "";
  // Admin DB overrides take priority
  if (overrides) {
    if (twoLevel && overrides[twoLevel]) return overrides[twoLevel];
    if (overrides[tld]) return overrides[tld];
  }
  if (twoLevel && LIFECYCLE_TABLE[twoLevel]) return LIFECYCLE_TABLE[twoLevel];
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
  /** Whether the phase was overridden from EPP status (more accurate) */
  phaseSource: "epp" | "dates";
}

/**
 * Map EPP status codes to a lifecycle phase.
 * Returns null if no phase-specific EPP code is detected.
 * EPP codes: https://www.icann.org/resources/pages/epp-status-codes-2014-06-16-en
 */
export function getPhaseFromEppStatus(eppStatuses: string[]): LifecyclePhase | null {
  if (!eppStatuses || eppStatuses.length === 0) return null;
  const normalized = eppStatuses.map((s) =>
    s.toLowerCase().replace(/[\s_-]/g, "").split(/\s+/)[0]
  );
  // Most specific first
  if (normalized.some((s) => s.includes("pendingdelete"))) return "pendingDelete";
  if (normalized.some((s) => s.includes("pendingpurge"))) return "pendingDelete";
  if (normalized.some((s) => s.includes("redemptionperiod"))) return "redemption";
  if (normalized.some((s) => s.includes("pendingrestore"))) return "redemption";
  if (normalized.some((s) => s.includes("autorenewperiod"))) return "grace";
  if (normalized.some((s) => s.includes("addperiod"))) return "grace";
  return null;
}

/** Compute the full lifecycle for a domain, optionally overriding phase with EPP status. */
export function computeLifecycle(
  domain: string,
  expirationDate: string | null,
  eppStatuses?: string[],
  overrides?: Record<string, TldLifecycle>
): LifecycleInfo | null {
  if (!expirationDate) return null;
  const expiry = new Date(expirationDate);
  if (isNaN(expiry.getTime())) return null;

  const tld = domain.split(".").pop()?.toLowerCase() ?? "";
  const cfg = getTldLifecycle(domain, overrides);
  const ms = (d: number) => d * 86_400_000;
  const graceEnd = new Date(expiry.getTime() + ms(cfg.grace));
  const redemptionEnd = new Date(graceEnd.getTime() + ms(cfg.redemption));
  const dropDate = new Date(redemptionEnd.getTime() + ms(cfg.pendingDelete));
  const now = new Date();
  const daysToExpiry = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);

  // Try EPP override first
  const eppPhase = eppStatuses ? getPhaseFromEppStatus(eppStatuses) : null;

  let phase: LifecyclePhase;
  let phaseSource: "epp" | "dates" = "dates";

  if (eppPhase) {
    phase = eppPhase;
    phaseSource = "epp";
  } else {
    if (now < expiry) phase = "active";
    else if (now < graceEnd) phase = "grace";
    else if (now < redemptionEnd) phase = "redemption";
    else if (now < dropDate) phase = "pendingDelete";
    else phase = "dropped";
  }

  return { phase, expiry, graceEnd, redemptionEnd, dropDate, cfg, tld, daysToExpiry, phaseSource };
}

/** Format a Date to YYYY/MM/DD (UTC). Used in emails and short displays. */
export function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
}

/** Format a Date to YYYY/MM/DD HH:mm:ss UTC (full precision). */
export function fmtDateTime(d: Date, showTz = true): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return showTz ? `${date} ${time} UTC` : `${date} ${time}`;
}

/**
 * Humanised countdown with hours precision when ≤ 7 days remain.
 * Returns e.g. "40天" or "3天14小时" or "5小时20分".
 */
export function fmtCountdown(targetDate: Date, isZh = true): string {
  const ms = targetDate.getTime() - Date.now();
  if (ms <= 0) return isZh ? "已过期" : "expired";
  const totalMins = Math.floor(ms / 60_000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  if (days >= 7) return isZh ? `${days}天` : `${days}d`;
  if (days > 0)  return isZh ? `${days}天${hours}小时` : `${days}d ${hours}h`;
  if (hours > 0) return isZh ? `${hours}小时${mins}分` : `${hours}h ${mins}m`;
  return isZh ? `${mins}分钟` : `${mins}min`;
}

export const PHASE_META = {
  active:        { zh: "正常有效", en: "Active",         color: "#059669", bg: "#ecfdf5" },
  grace:         { zh: "宽限期",   en: "Grace Period",   color: "#d97706", bg: "#fffbeb" },
  redemption:    { zh: "赎回期",   en: "Redemption",     color: "#ea580c", bg: "#fff7ed" },
  pendingDelete: { zh: "待删除",   en: "Pending Delete", color: "#dc2626", bg: "#fef2f2" },
  dropped:       { zh: "已释放",   en: "Available",      color: "#6b7280", bg: "#f9fafb" },
} as const;
