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
 * ccTLD RDAP endpoint overrides for registries not listed in the IANA bootstrap.
 * These are tried automatically when node-rdap cannot resolve an RDAP server.
 */
const CCTLD_RDAP_OVERRIDES: Record<string, string> = {
  // Europe / CIS
  ge: "https://rdap.nic.ge/",
  am: "https://rdap.nic.am/",
  az: "https://rdap.nic.az/",
  md: "https://rdap.nic.md/",
  ba: "https://rdap.nic.ba/",
  mk: "https://rdap.nic.mk/",
  al: "https://rdap.nic.al/",
  cy: "https://rdap.nic.cy/",
  mt: "https://rdap.nic.mt/",
  is: "https://rdap.isnic.is/",
  tj: "https://rdap.nic.tj/",
  tm: "https://rdap.nic.tm/",
  kg: "https://rdap.nic.kg/",
  uz: "https://rdap.nic.uz/",
  fo: "https://rdap.nic.fo/",
  gl: "https://rdap.nic.gl/",
  xk: "https://rdap.nic.xk/",
  // Africa
  td: "https://rdap.nic.td/",
  cd: "https://rdap.nic.cd/",
  ng: "https://rdap.nic.net.ng/",
  ke: "https://rdap.kenic.or.ke/",
  tz: "https://rdap.tznic.or.tz/",
  mw: "https://rdap.nic.mw/",
  gh: "https://rdap.nic.gh/",
  ug: "https://rdap.nic.ug/",
  rw: "https://rdap.ricta.org.rw/",
  zm: "https://rdap.zicta.zm/",
  ci: "https://rdap.nic.ci/",
  sn: "https://rdap.nic.sn/",
  cm: "https://rdap.netcom.cm/",
  mg: "https://rdap.nic.mg/",
  ly: "https://rdap.nic.ly/",
  sd: "https://rdap.nic.sd/",
  et: "https://rdap.nic.et/",
  dj: "https://rdap.nic.dj/",
  so: "https://rdap.nic.so/",
  ao: "https://rdap.nic.ao/",
  mz: "https://rdap.nic.mz/",
  zw: "https://rdap.zispa.co.zw/",
  na: "https://rdap.nic.na/",
  bw: "https://rdap.nic.bw/",
  sc: "https://rdap.nic.sc/",
  mu: "https://rdap.nic.mu/",
  // Middle East
  iq: "https://rdap.nic.iq/",
  om: "https://rdap.nic.om/",
  bh: "https://rdap.nic.bh/",
  jo: "https://rdap.nic.jo/",
  ps: "https://rdap.nic.ps/",
  sy: "https://rdap.nic.sy/",
  // Asia / Pacific
  bn: "https://rdap.bnnic.bn/",
  bt: "https://rdap.nic.bt/",
  mv: "https://rdap.nic.mv/",
  mm: "https://rdap.nic.mm/",
  kh: "https://rdap.nic.kh/",
  la: "https://rdap.nic.la/",
  np: "https://rdap.nic.np/",
  af: "https://rdap.nic.af/",
  pk: "https://rdap.pknic.net.pk/",
  pg: "https://rdap.nic.pg/",
  fj: "https://rdap.nic.fj/",
  ws: "https://rdap.nic.ws/",
  to: "https://rdap.nic.to/",
  vu: "https://rdap.nic.vu/",
  sb: "https://rdap.nic.sb/",
  // Caribbean / Americas
  ag: "https://rdap.nic.ag/",
  dm: "https://rdap.nic.dm/",
  gd: "https://rdap.nic.gd/",
  gy: "https://rdap.nic.gy/",
  ht: "https://rdap.nic.ht/",
  sr: "https://rdap.nic.sr/",
  bb: "https://rdap.nic.bb/",
  lc: "https://rdap.nic.lc/",
  vc: "https://rdap.nic.vc/",
  kn: "https://rdap.nic.kn/",
  tt: "https://rdap.nic.tt/",
  jm: "https://rdap.nic.jm/",
  bz: "https://rdap.nic.bz/",
  cu: "https://rdap.nic.cu/",
};

async function tryRdapOverride(domainToQuery: string): Promise<any | null> {
  const tld = domainToQuery.split(".").pop()?.toLowerCase();
  if (!tld) return null;
  const base = CCTLD_RDAP_OVERRIDES[tld];
  if (!base) return null;

  const url = `${base}domain/${domainToQuery}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/rdap+json, application/json" },
      signal: AbortSignal.timeout(12000),
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
    mozDomainAuthority: 0,
    mozPageAuthority: 0,
    mozSpamScore: 0,
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
