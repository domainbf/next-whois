// node-rdap is ESM-only; use dynamic import() so CJS serverless can load it
const getRdap = () => import("node-rdap");
import { WhoisAnalyzeResult, DomainStatusProps } from "./types";
import { extractDomain } from "@/lib/utils";
import { applyParams } from "./common_parser";
import { domainToASCII } from "url";

function derivePunycode(unicodeName: string): string | undefined {
  try {
    const ascii = domainToASCII(unicodeName.toLowerCase());
    if (ascii && ascii !== unicodeName.toLowerCase()) {
      return ascii.toUpperCase();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export interface RdapResponse {
  handle?: string;
  ldhName?: string;
  unicodeName?: string;
  entities?: Array<{
    handle?: string;
    roles?: string[];
    vcardArray?: any[];
    publicIds?: Array<{
      type: string;
      identifier: string;
    }>;
  }>;
  nameservers?: Array<{
    ldhName?: string;
    unicodeName?: string;
  }>;
  status?: string[];
  events?: Array<{
    eventAction: string;
    eventDate: string;
  }>;
  secureDNS?: {
    delegationSigned?: boolean;
    dsData?: Array<{
      keyTag?: number;
      algorithm?: number;
      digest?: string;
      digestType?: number;
    }>;
  };
  notices?: Array<{
    title?: string;
    description?: string[];
    links?: Array<{
      href: string;
      rel?: string;
      type?: string;
    }>;
  }>;
  startAddress?: string;
  endAddress?: string;
  ipVersion?: string;
  name?: string;
  type?: string;
  country?: string;
  parentHandle?: string;
  startAutnum?: string | number;
  endAutnum?: string | number;
}

function isIPAddress(query: string): boolean {
  const bare = query.replace(/\/\d{1,3}$/, "");
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){1,7}[0-9a-fA-F]{0,4}$/;
  return ipv4Regex.test(bare) || ipv6Regex.test(bare);
}

function isASNumber(query: string): boolean {
  return /^AS\d+$/i.test(query) || /^\d+$/.test(query);
}

/**
 * Fast-path RDAP endpoints for ccTLDs.
 * Entries here bypass the node-rdap IANA bootstrap lookup entirely — the domain
 * query is sent directly to the listed URL.  Sources:
 *   • IANA RDAP bootstrap  (https://data.iana.org/rdap/dns.json)  ← authoritative
 *   • registry public announcements for TLDs not yet in IANA bootstrap
 */
const CCTLD_RDAP_OVERRIDES: Record<string, string> = {
  // ── Western Europe (IANA) ────────────────────────────────────────────────
  ad: "https://rdap.nic.ad/",
  fi: "https://rdap.fi/rdap/rdap/",
  fo: "https://rdap.centralnic.com/fo/",        // IANA: CentralNIC hosts .fo
  fr: "https://rdap.nic.fr/",
  is: "https://rdap.isnic.is/rdap/",            // IANA: /rdap/ suffix required
  nl: "https://rdap.sidn.nl/",
  no: "https://rdap.norid.no/",
  pl: "https://rdap.dns.pl/",
  si: "https://rdap.register.si/",
  uk: "https://rdap.nominet.uk/uk/",
  // ── Eastern Europe / CIS ────────────────────────────────────────────────
  al: "https://rdap.nic.al/",
  am: "https://rdap.nic.am/",
  az: "https://rdap.nic.az/",
  ba: "https://rdap.nic.ba/",
  cy: "https://rdap.nic.cy/",
  cz: "https://rdap.nic.cz/",
  ge: "https://rdap.nic.ge/",
  kg: "http://rdap.cctld.kg/",                  // IANA: http (server does not do TLS)
  md: "https://rdap.nic.md/",
  mk: "https://rdap.nic.mk/",
  mt: "https://rdap.nic.mt/",
  tj: "https://rdap.nic.tj/",
  tm: "https://rdap.nic.tm/",
  ua: "https://rdap.hostmaster.ua/",
  uz: "https://rdap.cctld.uz/",                 // IANA: cctld.uz, not nic.uz
  // ── Northern / Other Europe ─────────────────────────────────────────────
  gl: "https://rdap.nic.gl/",
  xk: "https://rdap.nic.xk/",
  // ── Africa ──────────────────────────────────────────────────────────────
  ao: "https://rdap.nic.ao/",
  bw: "https://rdap.nic.bw/",
  cd: "https://rdap.nic.cd/",
  ci: "https://rdap.nic.ci/",
  cm: "https://rdap.nic.cm/",                   // IANA: nic.cm, not netcom.cm
  dj: "https://rdap.nic.dj/",
  et: "https://rdap.nic.et/",
  gh: "https://rdap.nic.gh/",
  ke: "https://rdap.kenic.or.ke/",
  ly: "https://rdap.nic.ly/",
  mg: "https://rdap.nic.mg/",
  ml: "https://rdap.nic.ml/",
  mu: "https://rdap.identitydigital.services/rdap/",  // IANA: IdentityDigital
  mw: "https://rdap.nic.mw/",
  mz: "https://rdap.nic.mz/",
  na: "https://keetmans.omadhina.co.na/",       // IANA: Namibian ccTLD registrar
  ng: "https://rdap.nic.net.ng/",
  rw: "https://rdap.ricta.org.rw/",
  sc: "https://rdap.nic.sc/",
  sd: "https://rdap.nic.sd/",
  sn: "https://rdap.nic.sn/whois43/",           // IANA: /whois43/ path required
  so: "https://rdap.nic.so/",
  ss: "https://rdap.nic.ss/",
  td: "https://rdap.nic.td/",
  tz: "https://whois.tznic.or.tz/rdap/",        // IANA: whois.tznic.or.tz/rdap/
  ug: "https://rdap.nic.ug/",
  zm: "https://rdap.nic.zm/",                   // IANA: nic.zm, not zicta.zm
  zw: "https://rdap.zispa.co.zw/",
  // ── Middle East ─────────────────────────────────────────────────────────
  bh: "https://rdap.nic.bh/",
  iq: "https://rdap.nic.iq/",
  jo: "https://rdap.nic.jo/",
  lb: "https://rdap.lbdr.org.lb/",
  om: "https://rdap.nic.om/",
  ps: "https://rdap.nic.ps/",
  sy: "https://rdap.nic.sy/",
  ye: "https://rdap.y.net.ye/",
  // ── Asia / Pacific ──────────────────────────────────────────────────────
  af: "https://rdap.nic.af/",
  as: "https://rdap.nic.as/",
  au: "https://rdap.cctld.au/rdap/",
  bn: "https://rdap.bnnic.bn/",
  bt: "https://rdap.nic.bt/",
  cc: "https://tld-rdap.verisign.com/cc/v1/",
  cx: "https://rdap.nic.cx/",
  fj: "https://www.rdap.fj/",                   // IANA: www.rdap.fj
  fm: "https://rdap.centralnic.com/fm/",
  gs: "https://rdap.nic.gs/",
  id: "https://rdap.pandi.id/rdap/",
  in: "https://rdap.nixiregistry.in/rdap/",
  kh: "https://rdap.nic.kh/",
  la: "https://rdap.nic.la/",
  mm: "https://rdap.nic.mm/",
  ms: "https://rdap.nic.ms/",
  mv: "https://rdap.nic.mv/",
  nf: "https://rdap.nic.nf/",
  np: "https://rdap.nic.np/",
  nz: "https://rdap.srs.net.nz/",
  pg: "https://rdap.nic.pg/",
  pk: "https://rdap.pknic.net.pk/",
  pn: "https://rdap.nominet.uk/pn/",
  pw: "https://rdap.radix.host/rdap/",
  sb: "https://rdap.nic.sb/",
  sg: "https://rdap.sgnic.sg/rdap/",
  th: "https://rdap.thains.co.th/",
  to: "https://rdap.tonicregistry.to/rdap/",    // IANA: tonicregistry.to
  tv: "https://rdap.nic.tv/",
  tw: "https://ccrdap.twnic.tw/tw/",
  vu: "https://rdap.nic.vu/",
  ws: "https://rdap.nic.ws/",
  // ── Caribbean / Americas ─────────────────────────────────────────────────
  ag: "https://rdap.nic.ag/",
  ai: "https://rdap.identitydigital.services/rdap/",
  ar: "https://rdap.nic.ar/",
  bb: "https://rdap.nic.bb/",
  bm: "https://rdap.identitydigital.services/rdap/",
  br: "https://rdap.registro.br/",
  bz: "https://rdap.nic.bz/",
  ca: "https://rdap.ca.fury.ca/rdap/",
  cr: "https://rdap.nic.cr/",
  cu: "https://rdap.nic.cu/",
  cv: "https://rdap.nic.cv/",
  dm: "https://rdap.nic.dm/",
  ec: "https://rdap.registry.ec/",
  gd: "https://rdap.centralnic.com/gd/",        // IANA: CentralNIC hosts .gd
  gy: "https://rdap.registry.gy/",              // IANA: registry.gy
  hn: "https://rdap.nic.hn/",
  ht: "https://rdap.nic.ht/",
  jm: "https://rdap.nic.jm/",
  kn: "https://rdap.nic.kn/",
  ky: "https://whois.kyregistry.ky/rdap/",
  lc: "https://rdap.nic.lc/",
  pm: "https://rdap.nic.pm/",
  re: "https://rdap.nic.re/",
  sr: "https://whois.sr/rdap/",                 // IANA: whois.sr/rdap/
  tf: "https://rdap.nic.tf/",
  tt: "https://rdap.nic.tt/",
  vc: "https://rdap.nic.vc/",
  vg: "https://rdap.centralnic.com/vg/",
  vi: "https://rdap.nic.vi/",
  wf: "https://rdap.nic.wf/",
  yt: "https://rdap.nic.yt/",
};

async function tryRdapOverride(domainToQuery: string, timeoutMs = 2500): Promise<any | null> {
  const tld = domainToQuery.split(".").pop()?.toLowerCase();
  if (!tld) return null;
  const base = CCTLD_RDAP_OVERRIDES[tld];
  if (!base) return null;

  const url = `${base}domain/${domainToQuery}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/rdap+json, application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.ldhName || json?.handle ? json : null;
  } catch {
    return null;
  }
}

export async function lookupRdap(query: string): Promise<any> {
  const cleanQuery = query.trim().toLowerCase();

  if (isIPAddress(cleanQuery)) {
    const { ip } = await getRdap();
    return await ip(cleanQuery);
  } else if (isASNumber(cleanQuery)) {
    const asNumber = cleanQuery.replace(/^as/i, "");
    const { autnum } = await getRdap();
    return await autnum(parseInt(asNumber));
  } else {
    const domainToQuery = extractDomain(cleanQuery) || cleanQuery;
    const tld = domainToQuery.split(".").pop()?.toLowerCase() ?? "";

    // Fast path: if we have an explicit ccTLD override, use it directly and
    // skip the node-rdap IANA-bootstrap round-trip entirely.  This avoids a
    // sequential "IANA probe → override" chain that can exceed the outer
    // RDAP_TIMEOUT for ccTLDs whose IANA entry is missing or slow.
    if (CCTLD_RDAP_OVERRIDES[tld]) {
      const override = await tryRdapOverride(domainToQuery, 4000);
      if (override) return override;
      throw new Error(`No RDAP server found for ${domainToQuery}`);
    }

    try {
      const { domain } = await getRdap();
      const result = await domain(domainToQuery);
      // node-rdap sometimes returns an error object instead of throwing
      if (result && result.errorCode) throw new Error(`RDAP error ${result.errorCode}`);
      return result;
    } catch {
      // Fall back to direct ccTLD RDAP override if available
      const override = await tryRdapOverride(domainToQuery);
      if (override) return override;
      throw new Error(`No RDAP server found for ${domainToQuery}`);
    }
  }
}

function extractVcardField(vcardArray: any[], fieldName: string): string {
  if (!vcardArray || !Array.isArray(vcardArray)) return "Unknown";

  for (const entry of vcardArray) {
    if (Array.isArray(entry) && entry[0] === fieldName) {
      return Array.isArray(entry[3])
        ? entry[3].join(", ")
        : String(entry[3] || "Unknown");
    }
  }
  return "Unknown";
}

function parseRdapEntity(entities: any[]): {
  registrar: string;
  registrarURL: string;
  ianaId: string;
  registrantOrganization: string;
  registrantCountry: string;
  registrantProvince: string;
  registrantPhone: string;
  registrantEmail: string;
} {
  let registrar = "Unknown";
  let registrarURL = "Unknown";
  let ianaId = "N/A";
  let registrantOrganization = "Unknown";
  let registrantCountry = "Unknown";
  let registrantProvince = "Unknown";
  let registrantPhone = "Unknown";
  let registrantEmail = "Unknown";

  for (const entity of entities) {
    if (entity.roles?.includes("registrar")) {
      if (entity.vcardArray?.[1]) {
        registrar = extractVcardField(entity.vcardArray[1], "fn");
        registrantOrganization = extractVcardField(entity.vcardArray[1], "org");
      }

      if (entity.publicIds) {
        const ianaEntry = entity.publicIds.find(
          (pub: any) => pub.type === "IANA Registrar ID",
        );
        if (ianaEntry) {
          ianaId = ianaEntry.identifier;
        }
      }
    }

    if (entity.roles?.includes("registrant") && entity.vcardArray?.[1]) {
      registrantOrganization =
        extractVcardField(entity.vcardArray[1], "org") ||
        registrantOrganization;
      registrantCountry =
        extractVcardField(entity.vcardArray[1], "country-name") ||
        registrantCountry;
      registrantProvince =
        extractVcardField(entity.vcardArray[1], "region") || registrantProvince;
      registrantPhone =
        extractVcardField(entity.vcardArray[1], "tel") || registrantPhone;
      registrantEmail =
        extractVcardField(entity.vcardArray[1], "email") || registrantEmail;
    }
  }

  return {
    registrar,
    registrarURL,
    ianaId,
    registrantOrganization,
    registrantCountry,
    registrantProvince,
    registrantPhone,
    registrantEmail,
  };
}

export async function convertRdapToWhoisResult(
  rdapData: any,
  originalQuery: string,
): Promise<WhoisAnalyzeResult> {
  const entities = rdapData.entities || [];
  const entityData = parseRdapEntity(entities);

  const events = rdapData.events || [];
  const creationEvent = events.find(
    (e: any) => e.eventAction === "registration",
  );
  const updateEvent = events.find((e: any) => e.eventAction === "last changed");
  const expirationEvent = events.find(
    (e: any) => e.eventAction === "expiration",
  );

  const creationDate = creationEvent?.eventDate || "Unknown";
  const updatedDate = updateEvent?.eventDate || "Unknown";
  const expirationDate = expirationEvent?.eventDate || "Unknown";

  const domainAge =
    creationDate !== "Unknown"
      ? Math.floor(
          (Date.now() - new Date(creationDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  const remainingDays =
    expirationDate !== "Unknown"
      ? Math.floor(
          (new Date(expirationDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  const status: DomainStatusProps[] = (rdapData.status || []).map((s: any) => ({
    status: s,
    url: "https://icann.org/epp",
  }));

  const nameServers = (rdapData.nameservers || []).map(
    (ns: any) => (ns.ldhName || ns.unicodeName || "Unknown").split(/\s+/)[0],
  );

  const ldhNameRaw = rdapData.ldhName || undefined;
  const ldhName = ldhNameRaw ? ldhNameRaw.toUpperCase() : undefined;
  const unicodeName = rdapData.unicodeName || undefined;

  let displayDomain: string;
  let punycodeDomain: string | undefined;

  if (unicodeName) {
    displayDomain = unicodeName;
    if (ldhName && ldhName.toLowerCase() !== unicodeName.toLowerCase()) {
      punycodeDomain = ldhName;
    } else {
      punycodeDomain = derivePunycode(unicodeName);
    }
  } else if (ldhNameRaw) {
    const { domainToUnicode } = require("url");
    try {
      const unicode = domainToUnicode(ldhNameRaw.toLowerCase());
      if (unicode && unicode !== ldhNameRaw.toLowerCase()) {
        displayDomain = unicode;
        punycodeDomain = ldhName;
      } else {
        displayDomain = ldhName || ldhNameRaw;
      }
    } catch {
      displayDomain = ldhName || ldhNameRaw;
    }
  } else {
    displayDomain = originalQuery;
  }

  const result = {
    domain: displayDomain,
    domainPunycode: punycodeDomain,
    registrar: entityData.registrar,
    registrarURL: entityData.registrarURL,
    ianaId: entityData.ianaId,
    whoisServer: "https://rdap.org",
    updatedDate,
    creationDate,
    expirationDate,
    status,
    nameServers,
    registrantOrganization: entityData.registrantOrganization,
    registrantProvince: entityData.registrantProvince,
    registrantCountry: entityData.registrantCountry,
    registrantPhone: entityData.registrantPhone,
    registrantEmail: entityData.registrantEmail,
    dnssec: rdapData.secureDNS?.delegationSigned
      ? "signedDelegation"
      : "unsigned",
    rawWhoisContent: "",
    rawRdapContent: JSON.stringify(rdapData, null, 2),
    domainAge,
    remainingDays,
    registerPrice: null,
    renewPrice: null,
    negotiable: null,
    cidr:
      rdapData.startAddress && rdapData.endAddress
        ? `${rdapData.startAddress}-${rdapData.endAddress}`
        : "Unknown",
    inetNum: rdapData.startAddress || "Unknown",
    inet6Num:
      rdapData.ipVersion === "v6"
        ? rdapData.startAddress || "Unknown"
        : "Unknown",
    netRange:
      rdapData.startAddress && rdapData.endAddress
        ? `${rdapData.startAddress} - ${rdapData.endAddress}`
        : "Unknown",
    netName: rdapData.name || "Unknown",
    netType: rdapData.type || "Unknown",
    originAS: rdapData.startAutnum ? `AS${rdapData.startAutnum}` : "Unknown",
  };

  return await applyParams(result);
}
