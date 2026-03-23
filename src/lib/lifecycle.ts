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
// Standard ICANN gTLD lifecycle (used as default for all unknown gTLDs)
// ─────────────────────────────────────────────────────────────────────────────
const STD: TldLifecycle = { grace: 45, redemption: 30, pendingDelete: 5, confidence: "high" };

// AFNIC managed ccTLDs (fr, pm, re, tf, wf, yt) — no grace, 30-day restore
const AFNIC: TldLifecycle = { grace: 0, redemption: 30, pendingDelete: 10, registry: "AFNIC", confidence: "high" };

// Immediate-delete ccTLDs (DENIC-style): no grace, no redemption, no pendingDelete
const IMMEDIATE: TldLifecycle = { grace: 0, redemption: 0, pendingDelete: 0, confidence: "high" };

// Short grace, no redemption (NL-style)
const SHORT_GRACE: TldLifecycle = { grace: 40, redemption: 0, pendingDelete: 0, confidence: "est" };

/**
 * Comprehensive gTLD + ccTLD lifecycle table.
 * Sources: ICANN RAA, registry policy pages, IANA documentation.
 */
export const LIFECYCLE_TABLE: Record<string, TldLifecycle> = {

  // ── Tier-1 gTLD ──────────────────────────────────────────────────────────
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
  // ── Google new gTLD ───────────────────────────────────────────────────────
  app:    { ...STD, registry: "Google" },
  dev:    { ...STD, registry: "Google" },
  page:   { ...STD, registry: "Google" },
  web:    { ...STD, registry: "Identity Digital" },
  // ── Common new gTLD (standard ICANN) ─────────────────────────────────────
  shop:   { ...STD },
  blog:   { ...STD },
  cloud:  { ...STD },
  tech:   { ...STD },
  online: { ...STD },
  site:   { ...STD },
  store:  { ...STD },
  live:   { ...STD },
  link:   { ...STD },
  media:  { ...STD },
  news:   { ...STD },
  email:  { ...STD },
  space:  { ...STD },
  world:  { ...STD },
  pro:    { ...STD, registry: "Identity Digital" },
  work:   { ...STD },
  tools:  { ...STD },
  run:    { ...STD },
  team:   { ...STD },
  digital:{ ...STD },
  global: { ...STD },
  network:{ ...STD },
  host:   { ...STD },
  studio: { ...STD },
  design: { ...STD },
  agency: { ...STD },
  group:  { ...STD },
  plus:   { ...STD },
  guru:   { ...STD },
  expert: { ...STD },
  solutions: { ...STD },
  systems:   { ...STD },
  services:  { ...STD },
  support:   { ...STD },
  help:      { ...STD },
  guide:     { ...STD },
  review:    { ...STD },
  reviews:   { ...STD },
  social:    { ...STD },
  photos:    { ...STD },
  video:     { ...STD },
  audio:     { ...STD },
  music:     { ...STD },
  art:       { ...STD },
  gallery:   { ...STD },
  sale:      { ...STD },
  deals:     { ...STD },
  events:    { ...STD },
  travel:    { ...STD },
  hotel:     { ...STD },
  fashion:   { ...STD },
  sport:     { ...STD },
  health:    { ...STD },
  care:      { ...STD },
  yoga:      { ...STD },
  fit:       { ...STD },
  finance:   { ...STD },
  money:     { ...STD },
  fund:      { ...STD },
  capital:   { ...STD },
  bank:      { ...STD, registry: "SWIFT" },
  law:       { ...STD },
  legal:     { ...STD },
  edu:       { grace: 45, redemption: 30, pendingDelete: 5, registry: "Educause", confidence: "high" },
  gov:       { grace: 45, redemption: 30, pendingDelete: 5, registry: "CISA", confidence: "high" },
  mil:       { grace: 45, redemption: 30, pendingDelete: 5, registry: "DoD", confidence: "high" },
  int:       { grace: 45, redemption: 30, pendingDelete: 5, registry: "IANA", confidence: "high" },

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

  // ── Asia-Pacific ccTLD ────────────────────────────────────────────────────
  cn:     { grace: 0,  redemption: 30, pendingDelete: 5,  registry: "CNNIC",  confidence: "high" },
  tw:     { grace: 0,  redemption: 30, pendingDelete: 5,  registry: "TWNIC",  confidence: "high" },
  hk:     { grace: 0,  redemption: 30, pendingDelete: 5,  registry: "HKIRC",  confidence: "high" },
  mo:     { grace: 0,  redemption: 30, pendingDelete: 5,  registry: "MONIC (Macau)", confidence: "est" },
  jp:     { ...IMMEDIATE,                                  registry: "JPRS",   },
  kr:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "KISA",   confidence: "high" },
  sg:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "SGNIC",  confidence: "high" },
  my:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "MYNIC",  confidence: "high" },
  ph:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "PH Domains", confidence: "est" },
  id:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "PANDI",  confidence: "high" },
  vn:     { grace: 0,  redemption: 30, pendingDelete: 0,  registry: "VNNIC",  confidence: "high" },
  th:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "THNIC",  confidence: "high" },
  mm:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "Myanmar NIC", confidence: "est" },
  kh:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NiC.KH", confidence: "est" },
  bn:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "BNNIC",  confidence: "est" },
  au:     { grace: 0,  redemption: 0,  pendingDelete: 5,  registry: "auDA",   confidence: "high" },
  nz:     { ...IMMEDIATE,                                  registry: "InternetNZ", },
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

  // ── UK second-level domains (all managed by Nominet, same lifecycle as .uk)
  "co.uk":   { grace: 92, redemption: 0, pendingDelete: 0, registry: "Nominet", confidence: "high" },
  "org.uk":  { grace: 92, redemption: 0, pendingDelete: 0, registry: "Nominet", confidence: "high" },
  "me.uk":   { grace: 92, redemption: 0, pendingDelete: 0, registry: "Nominet", confidence: "high" },
  "net.uk":  { grace: 92, redemption: 0, pendingDelete: 0, registry: "Nominet", confidence: "high" },
  "ltd.uk":  { grace: 92, redemption: 0, pendingDelete: 0, registry: "Nominet", confidence: "high" },
  "plc.uk":  { grace: 92, redemption: 0, pendingDelete: 0, registry: "Nominet", confidence: "high" },
  "com.au":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "auDA",   confidence: "high" },
  "net.au":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "auDA",   confidence: "high" },
  "org.au":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "auDA",   confidence: "high" },
  "com.cn":  { grace: 0,  redemption: 30, pendingDelete: 5, registry: "CNNIC",  confidence: "high" },
  "net.cn":  { grace: 0,  redemption: 30, pendingDelete: 5, registry: "CNNIC",  confidence: "high" },
  "org.cn":  { grace: 0,  redemption: 30, pendingDelete: 5, registry: "CNNIC",  confidence: "high" },
  "com.hk":  { grace: 0,  redemption: 30, pendingDelete: 5, registry: "HKIRC",  confidence: "high" },
  "com.br":  { grace: 0,  redemption: 0,  pendingDelete: 0, registry: "Registro.br", confidence: "high" },
  "com.mx":  { grace: 30, redemption: 30, pendingDelete: 5, registry: "NIC México", confidence: "high" },
  "com.ar":  { ...IMMEDIATE,                                 registry: "NIC Argentina" },
  "co.jp":   { ...IMMEDIATE,                                 registry: "JPRS" },
  "or.jp":   { ...IMMEDIATE,                                 registry: "JPRS" },
  "ne.jp":   { ...IMMEDIATE,                                 registry: "JPRS" },
  "co.kr":   { grace: 30, redemption: 30, pendingDelete: 5, registry: "KISA",   confidence: "high" },

  // ── Europe ccTLD ──────────────────────────────────────────────────────────
  uk:     { grace: 92, redemption: 0,  pendingDelete: 0,  registry: "Nominet", confidence: "high" },
  de:     { ...IMMEDIATE,                                  registry: "DENIC",  },
  fr:     { ...AFNIC },
  pm:     { ...AFNIC },
  re:     { ...AFNIC },
  tf:     { ...AFNIC },
  wf:     { ...AFNIC },
  yt:     { ...AFNIC },
  nl:     { grace: 40, redemption: 0,  pendingDelete: 0,  registry: "SIDN",   confidence: "high" },
  eu:     { grace: 40, redemption: 0,  pendingDelete: 0,  registry: "EURid",  confidence: "high" },
  es:     { ...IMMEDIATE,                                  registry: "Red.es", },
  it:     { ...IMMEDIATE,                                  registry: "Registro.it", },
  pl:     { ...IMMEDIATE,                                  registry: "NASK",   },
  se:     { ...IMMEDIATE,                                  registry: "IIS",    },
  no:     { ...IMMEDIATE,                                  registry: "Norid",  },
  fi:     { ...IMMEDIATE,                                  registry: "Traficom", },
  dk:     { ...IMMEDIATE,                                  registry: "DK Hostmaster", },
  be:     { ...IMMEDIATE,                                  registry: "DNS Belgium", },
  at:     { ...IMMEDIATE,                                  registry: "nic.at", },
  ch:     { grace: 30, redemption: 0,  pendingDelete: 5,  registry: "SWITCH", confidence: "high" },
  li:     { grace: 30, redemption: 0,  pendingDelete: 5,  registry: "SWITCH (Liechtenstein)", confidence: "high" },
  pt:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "DNS.PT", confidence: "high" },
  ie:     { ...IMMEDIATE,                                  registry: "IEDR",   },
  is:     { ...IMMEDIATE,                                  registry: "ISNIC",  },
  cz:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "CZ.NIC", confidence: "high" },
  sk:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "SK-NIC", confidence: "est" },
  hu:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "ISZT",   confidence: "est" },
  ro:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "RoTLD",  confidence: "est" },
  bg:     { grace: 30, redemption: 0,  pendingDelete: 5,  registry: "Register.BG", confidence: "est" },
  hr:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "CARNet", confidence: "est" },
  si:     { ...IMMEDIATE,                                  registry: "ARNES",  },
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
  ee:     { ...IMMEDIATE,                                  registry: "EENet (Estonia)", },
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

  // ── Americas ccTLD ────────────────────────────────────────────────────────
  ca:     { grace: 40, redemption: 30, pendingDelete: 5,  registry: "CIRA",   confidence: "high" },
  br:     { grace: 0,  redemption: 0,  pendingDelete: 0,  registry: "Registro.br", confidence: "high" },
  mx:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "NIC México", confidence: "high" },
  ar:     { ...IMMEDIATE,                                  registry: "NIC Argentina", },
  cl:     { ...IMMEDIATE,                                  registry: "NIC Chile",  },
  co_cc:  { grace: 45, redemption: 30, pendingDelete: 5,  registry: "NIC Colombia", confidence: "est" },
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

  // ── Africa / Middle-East ccTLD ────────────────────────────────────────────
  za:     { ...IMMEDIATE,                                  registry: "ZADNA",  },
  ng:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "NIRA (Nigeria)", confidence: "est" },
  ke:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "KENIC (Kenya)", confidence: "est" },
  gh:     { grace: 30, redemption: 30, pendingDelete: 5,  registry: "NCA (Ghana)", confidence: "est" },
  tz:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "TZNIC (Tanzania)", confidence: "est" },
  ug:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "UIXP (Uganda)", confidence: "est" },
  rw:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "RICTA (Rwanda)", confidence: "est" },
  et:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "EthiopTelecom", confidence: "est" },
  eg:     { ...IMMEDIATE,                                  registry: "NTRA (Egypt)", },
  ma:     { ...IMMEDIATE,                                  registry: "ANRT (Morocco)", },
  tn:     { ...IMMEDIATE,                                  registry: "ATI (Tunisia)", },
  dz:     { ...IMMEDIATE,                                  registry: "ENIC (Algeria)", },
  ly:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "LYNIC (Libya)", confidence: "est" },
  sd:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "SUDATEL (Sudan)", confidence: "est" },
  cm:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC-Cameroon", confidence: "est" },
  sn:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC Senegal", confidence: "est" },
  ci:     { grace: 30, redemption: 0,  pendingDelete: 0,  registry: "NIC CI (Côte d'Ivoire)", confidence: "est" },
  tr:     { ...IMMEDIATE,                                  registry: "NIC TR", },

  // ── Popular sport/vanity ccTLDs ───────────────────────────────────────────
  tk:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Dot TK (Tokelau)", confidence: "est" },
  ml:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "SOTELMA (Mali)", confidence: "est" },
  ga:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "Gabon NIC", confidence: "est" },
  cf:     { grace: 45, redemption: 30, pendingDelete: 5,  registry: "CAF NIC (Cent. Africa)", confidence: "est" },
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
