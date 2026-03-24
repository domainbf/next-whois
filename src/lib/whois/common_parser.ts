import {
  DomainStatusProps,
  initialWhoisAnalyzeResult,
  WhoisAnalyzeResult,
} from "@/lib/whois/types";
import { includeArgs } from "@/lib/utils";
import moment from "moment";
import { domainToUnicode } from "url";
import { getDomainPricing, getDomainTransferNegotiable } from "@/lib/pricing/client";

function convertIdnToUnicode(domain: string): {
  unicode: string;
  punycode?: string;
} {
  try {
    const hasAceLabel = domain
      .toLowerCase()
      .split(".")
      .some((label) => label.startsWith("xn--"));
    if (!hasAceLabel) return { unicode: domain };
    const unicode = domainToUnicode(domain.toLowerCase());
    if (unicode && unicode !== domain.toLowerCase()) {
      return { unicode, punycode: domain.toUpperCase() };
    }
    return { unicode: domain };
  } catch {
    return { unicode: domain };
  }
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&eacute;": "é",
  "&Eacute;": "É",
  "&egrave;": "è",
  "&Egrave;": "È",
  "&ecirc;": "ê",
  "&Ecirc;": "Ê",
  "&euml;": "ë",
  "&aacute;": "á",
  "&Aacute;": "Á",
  "&agrave;": "à",
  "&Agrave;": "À",
  "&acirc;": "â",
  "&Acirc;": "Â",
  "&auml;": "ä",
  "&Auml;": "Ä",
  "&aring;": "å",
  "&Aring;": "Å",
  "&oacute;": "ó",
  "&Oacute;": "Ó",
  "&ograve;": "ò",
  "&ocirc;": "ô",
  "&ouml;": "ö",
  "&Ouml;": "Ö",
  "&uacute;": "ú",
  "&ugrave;": "ù",
  "&uuml;": "ü",
  "&Uuml;": "Ü",
  "&iacute;": "í",
  "&igrave;": "ì",
  "&icirc;": "î",
  "&iuml;": "ï",
  "&ccedil;": "ç",
  "&Ccedil;": "Ç",
  "&ntilde;": "ñ",
  "&Ntilde;": "Ñ",
  "&szlig;": "ß",
  "&aelig;": "æ",
  "&AElig;": "Æ",
  "&oslash;": "ø",
  "&Oslash;": "Ø",
  "&eth;": "ð",
  "&thorn;": "þ",
  "&laquo;": "«",
  "&raquo;": "»",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
};

function decodeHtmlEntities(str: string): string {
  if (!str || !str.includes("&")) return str;
  let result = str;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.split(entity).join(char);
  }
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10)),
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  return result;
}

function cleanFieldValue(value: string): string {
  if (!value) return value;
  let cleaned = value.trim();
  cleaned = decodeHtmlEntities(cleaned);
  cleaned = cleaned.replace(/^[\s\u00a0\u2022\u00b7·\-]+/, "").trim();
  cleaned = cleaned.replace(/^\.{3,}\s*/, "").trim();
  return cleaned;
}

function isRedactedValue(value: string): boolean {
  if (!value) return false;
  const dotRatio = (value.match(/\./g) || []).length / value.length;
  if (dotRatio > 0.5 && value.length > 5) return true;
  if (/^[.\s]+$/.test(value)) return true;
  if (/REDACTED|WITHHELD|PRIVACY|NOT DISCLOSED/i.test(value)) return true;
  return false;
}

function analyzeDomainStatus(status: string): DomainStatusProps {
  const cleaned = cleanFieldValue(status);
  const segments = cleaned.split(" ");
  let url = segments.slice(1).join(" ");

  url.startsWith("(") && url.endsWith(")") && (url = url.slice(1, -1));
  return {
    status: segments[0],
    url,
  };
}

const DATE_FORMATS = [
  "YYYY-MM-DDTHH:mm:ssZ",
  "YYYY-MM-DDTHH:mm:ss.SSSZ",
  "YYYY-MM-DDTHH:mm:ssZZ",
  "YYYY-MM-DD HH:mm:ss",
  "YYYY-MM-DD HH:mm:ssZ",
  "YYYY-MM-DD",
  "DD.MM.YYYY HH:mm:ss",
  "DD.MM.YYYY HH:mm",
  "DD.MM.YYYY",
  "DD-MM-YYYY HH:mm:ss",
  "DD-MM-YYYY",
  "MM/DD/YYYY HH:mm:ss",
  "MM/DD/YYYY",
  "YYYY/MM/DD HH:mm:ss",
  "YYYY/MM/DD",
  "YYYY.MM.DD HH:mm:ss",
  "YYYY.MM.DD",
  "DD MMM YYYY",
  "DD-MMM-YYYY",
  "MMM DD YYYY",
  "MMM DD, YYYY",
  "D-MMM-YYYY",
  "YYYYMMDD",
  "YYYY-MM-DDTHH:mm:ss.SSS[Z]",
  "ddd MMM DD HH:mm:ss [UTC] YYYY",
  "ddd, DD MMM YYYY HH:mm:ss ZZ",
  "DD/MM/YYYY HH:mm:ss",
  "DD/MM/YYYY",
  "D MMM YYYY",
  "YYYY-MM-DD HH:mm:ss UTC",
  "YYYY-MM-DDZ",
  "MM-DD-YYYY",
  "YYYY MM DD",
  "D/M/YYYY",
  "D.M.YYYY",
];

const DATE_REGEX = /\b(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:?\d{2}|Z)?)?|\d{2}[.\/\-]\d{2}[.\/\-]\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}[.\/]\d{2}[.\/]\d{2})\b/i;

function extractDateNearKeyword(raw: string, keywords: string[]): string {
  const lines = raw.split("\n");
  for (const line of lines) {
    const lower = line.toLowerCase();
    const hasKeyword = keywords.some((kw) => lower.includes(kw));
    if (!hasKeyword) continue;
    const m = line.match(DATE_REGEX);
    if (m) {
      const parsed = analyzeTime(m[1]);
      if (parsed && parsed !== m[1]) return parsed;
    }
  }
  return "";
}

function analyzeTime(time: string): string {
  if (!time || time.length === 0) return time;

  try {
    let cleaned = time
      .replace(/<|>/g, "")
      .replace(/\[.*?\]/g, "")
      .trim();

    const beforePrefix = cleaned.match(/^before\s+(.+)$/i);
    if (beforePrefix) cleaned = beforePrefix[1].trim();

    const parenMatch = cleaned.match(/^(.+?)\s*\(.*?\)\s*$/);
    if (parenMatch) cleaned = parenMatch[1].trim();

    const m = moment(cleaned, DATE_FORMATS, true);
    if (m.isValid()) return m.toISOString();

    const mLenient = moment(cleaned, DATE_FORMATS, false);
    if (mLenient.isValid()) return mLenient.toISOString();

    const native = new Date(cleaned);
    if (!isNaN(native.getTime())) return native.toISOString();

    return time;
  } catch (e) {
    return time;
  }
}

function calculateDomainAge(creationDate: string): number {
  if (creationDate === "Unknown") return 0;

  const created = moment(creationDate);
  const now = moment();

  return now.diff(created, "years");
}

function calculateRemainingDays(expirationDate: string): number {
  if (expirationDate === "Unknown") return 0;

  const expiry = moment(expirationDate);
  const now = moment();

  return Math.max(0, expiry.diff(now, "days"));
}

export async function applyParams(result: WhoisAnalyzeResult) {
  // Calculate domain age and remaining days
  result.domainAge =
    !result.creationDate || result.creationDate === "Unknown"
      ? null
      : calculateDomainAge(result.creationDate);
  result.remainingDays =
    !result.expirationDate || result.expirationDate === "Unknown"
      ? null
      : calculateRemainingDays(result.expirationDate);

  const [registerPrice, renewPrice, negotiable] = await Promise.all([
    getDomainPricing(result.domain, "new"),
    getDomainPricing(result.domain, "renew"),
    getDomainTransferNegotiable(result.domain),
  ]);
  result.registerPrice = registerPrice;
  result.renewPrice = renewPrice;
  result.negotiable = negotiable;

  return result;
}

export async function analyzeWhois(data: string): Promise<WhoisAnalyzeResult> {
  const lines = data
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const result: WhoisAnalyzeResult = {
    ...initialWhoisAnalyzeResult,
    status: [],
    nameServers: [],
    rawWhoisContent: data,
  };

  let explicitUnicodeDomain = "";
  let explicitAsciiDomain = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    let key: string;
    let value: string;

    const bracketMatch = line.match(/^(?:[a-z]\.\s*)?\[(.+?)\]\s+(.+)/);
    if (bracketMatch) {
      key = bracketMatch[1].trim().toLowerCase();
      value = cleanFieldValue(bracketMatch[2].trim());
    } else {
      let segments = line.split(":");
      if (segments.length < 2) continue;
      if (segments.length >= 3 && segments[0].toLowerCase() === "network") {
        segments = segments.slice(1);
      }
      key = segments[0].trim().toLowerCase();
      value = cleanFieldValue(segments.slice(1).join(":").trim());
    }

    if (!value) continue;

    switch (key) {
      case "domain name (unicode)":
        if (!explicitUnicodeDomain) explicitUnicodeDomain = value;
        break;
      case "domain name (ascii)":
        if (!explicitAsciiDomain) explicitAsciiDomain = value;
        result.domain = result.domain || value;
        break;
      case "domain name":
      case "domain":
      case "nom de domaine":
      case "domaine":
        result.domain = result.domain || value;
        break;
      case "registrar":
      case "authorized agency":
      case "sponsoring registrar":
      case "registrar name":
      case "registrant registrar":
      case "registration service provider":
      case "enregistreur":
      case "bureau d'enregistrement":
        result.registrar = result.registrar === "Unknown" ? value : result.registrar;
        break;
      case "registrar url":
        result.registrarURL = value;
        break;
      case "iana id":
        result.ianaId = value;
        break;
      case "registrar iana id":
        result.ianaId = value;
        break;
      case "whois server":
        result.whoisServer = value;
        break;
      case "whois":
        result.whoisServer = value;
        break;
      case "registrar whois server":
        result.whoisServer = value;
        break;
      case "updated date":
      case "last updated date":
      case "last modified":
      case "last-modified":
      case "modification date":
      case "modified":
      case "last update":
      case "last updated":
      case "update date":
      case "date updated":
      case "updated on":
      case "modified on":
      case "date de mise a jour":
      case "date de mise à jour":
      case "zuletzt geaendert am":
      case "updated (utc)":
      case "last-update":
      case "updated":
      case "last changed":
      case "changed on":
      case "modifié le":
      case "fecha de modificacion":
      case "actualizado":
        if (result.updatedDate === "Unknown") result.updatedDate = analyzeTime(value);
        break;
      case "changed":
        if (result.updatedDate === "Unknown") result.updatedDate = analyzeTime(value);
        break;
      case "creation date":
      case "registered date":
      case "activation":
      case "activation date":
      case "registered on":
      case "date registered":
      case "domain registered":
      case "created":
      case "created on":
      case "created date":
      case "registration date":
      case "registration time":
      case "date de creation":
      case "date de création":
      case "registriert am":
      case "datum registracije":
      case "created (utc)":
      case "created date (utc)":
      case "reg date":
      case "create date":
      case "entry created":
      case "domain registration date":
      case "first registered":
      case "registered":
      case "register date":
      case "start date":
      case "date d'enregistrement":
      case "enregistré le":
      case "fecha de registro":
      case "fecha de creacion":
      case "fecha creacion":
      case "criado em":
      case "data de registro":
      case "anniversary":
        if (result.creationDate === "Unknown") result.creationDate = analyzeTime(value);
        break;
      case "domain name commencement date":
        if (result.creationDate === "Unknown") result.creationDate = analyzeTime(value);
        break;
      case "expiration date":
      case "expiration":
      case "valid until":
      case "paid-till":
      case "paid till":
      case "expires on":
      case "expire date":
      case "expire":
      case "expires":
      case "expiry date":
      case "expiry":
      case "registry expiration date":
      case "date expiration":
      case "date d'expiration":
      case "ablaufdatum":
      case "expires (utc)":
      case "expiration date (utc)":
      case "renewal date":
      case "due date":
      case "valid-date":
      case "expire-date":
      case "expiration-date":
      case "end date":
      case "domain expiration date":
      case "fecha de vencimiento":
      case "fecha expiracion":
      case "fecha de expiracion":
      case "validade":
      case "vence em":
      case "ablauf":
      case "laufzeit bis":
        if (result.expirationDate === "Unknown") result.expirationDate = analyzeTime(value);
        break;
      case "registrar registration expiration date":
        if (result.expirationDate === "Unknown") result.expirationDate = analyzeTime(value);
        break;
      case "registry expiry date":
        if (result.expirationDate === "Unknown") result.expirationDate = analyzeTime(value);
        break;
      case "state": {
        const expiryMatch = value.match(/\((\d{4}\/\d{2}\/\d{2})\)/);
        if (expiryMatch && result.expirationDate === "Unknown") {
          result.expirationDate = analyzeTime(expiryMatch[1]);
        }
        result.status.push(analyzeDomainStatus(value));
        break;
      }
      case "status":
      case "registration status":
        result.status.push(analyzeDomainStatus(value));
        break;
      case "domain status":
        result.status.push(analyzeDomainStatus(value));
        break;
      case "name server":
      case "name server (db)":
      case "host name":
      case "nameserver":
      case "ns":
      case "ns1":
      case "ns2":
      case "ns3":
      case "ns4":
      case "dns":
      case "dns1":
      case "dns2":
      case "dns3":
      case "dns4":
      case "serveur dns":
        result.nameServers.push(value.split(/\s+/)[0]);
        break;
      case "nameservers":
        result.nameServers.push(value);
        break;
      case "nserver":
        result.nameServers.push(value.split(/\s+/)[0]);
        break;
      case "registrant name":
        if (!isRedactedValue(value)) result.registrantOrganization = value;
        break;
      case "registrant organization":
        if (!isRedactedValue(value)) result.registrantOrganization = value;
        break;
      case "organization":
        if (!isRedactedValue(value)) result.registrantOrganization = value;
        break;
      case "organisation":
        if (!isRedactedValue(value)) result.registrantOrganization = value;
        break;
      case "org-name":
        if (!isRedactedValue(value)) result.registrantOrganization = value;
        break;
      case "registrant":
        if (!isRedactedValue(value)) result.registrantOrganization = value;
        break;
      case "descr":
        if (
          !isRedactedValue(value) &&
          result.registrantOrganization === "Unknown"
        )
          result.registrantOrganization = value;
        break;
      case "registrant state/province":
        if (!isRedactedValue(value)) result.registrantProvince = value;
        break;
      case "city":
        if (!isRedactedValue(value)) result.registrantProvince = value;
        break;
      case "registrant country":
        if (!isRedactedValue(value)) result.registrantCountry = value;
        break;
      case "country":
        if (!isRedactedValue(value)) result.registrantCountry = value;
        break;
      case "registrant phone":
        if (!isRedactedValue(value))
          result.registrantPhone = value.replace("tel:", "").trim();
        break;
      case "registrar abuse contact phone":
      case "ac phone number":
        if (!isRedactedValue(value))
          result.registrantPhone = value.replace("tel:", "").trim();
        break;
      case "orgtechphone":
        if (!isRedactedValue(value)) result.registrantPhone = value;
        break;
      case "registrant email":
        if (!isRedactedValue(value))
          result.registrantEmail = value.replace(
            "Select Request Email Form at ",
            "",
          );
        break;
      case "dnssec":
        result.dnssec = value;
        break;
      case "email":
      case "ac e-mail":
        if (!isRedactedValue(value)) result.registrantEmail = value;
        break;
      case "e-mail":
        if (!isRedactedValue(value) && result.registrantEmail === "Unknown")
          result.registrantEmail = value;
        break;
      case "cidr":
        result.cidr = value;
        break;
      case "inetnum":
        result.inetNum = value;
        break;
      case "inet6num":
        result.inet6Num = value;
        break;
      case "netrange":
        result.netRange = value;
        break;
      case "netname":
        result.netName = value;
        break;
      case "network-name":
        result.netName = value;
        break;
      case "nettype":
        result.netType = value;
        break;
      case "originas":
        result.originAS = value;
        break;
      case "origin":
        result.originAS = value;
        break;
    }

    if (includeArgs(key, "domain name") && !result.domain) {
      result.domain = value;
    } else if (
      includeArgs(key, "registrar") &&
      !includeArgs(key, "expir", "date", "phone", "email", "url", "whois", "iana", "server", "abuse", "registration") &&
      result.registrar === "Unknown"
    ) {
      result.registrar = value;
    } else if (
      includeArgs(key, "contact email") &&
      result.registrantEmail === "Unknown" &&
      !isRedactedValue(value)
    ) {
      result.registrantEmail = value;
    } else if (
      includeArgs(key, "contact phone") &&
      result.registrantPhone === "Unknown" &&
      !isRedactedValue(value)
    ) {
      result.registrantPhone = value;
    } else if (
      includeArgs(
        key,
        "creation",
        "created",
        "created date",
        "registration time",
        "registered",
        "commencement",
      ) &&
      result.creationDate === "Unknown"
    ) {
      result.creationDate = analyzeTime(value);
    } else if (
      includeArgs(key, "expiration", "expiry", "expire", "expire date") &&
      result.expirationDate === "Unknown"
    ) {
      result.expirationDate = analyzeTime(value);
    } else if (
      includeArgs(
        key,
        "updated",
        "update",
        "last update",
        "last updated",
        "last-modified",
      ) &&
      result.updatedDate === "Unknown"
    ) {
      result.updatedDate = analyzeTime(value);
    } else if (
      includeArgs(key, "account name", "registrant org") &&
      result.registrantOrganization === "Unknown" &&
      !isRedactedValue(value)
    ) {
      result.registrantOrganization = value;
    }
  }

  let newStatus: DomainStatusProps[] = [];
  for (let i = 0; i < result.status.length; i++) {
    const status = result.status[i];
    if (newStatus.find((item) => item.status === status.status)) continue;
    newStatus.push(status);
  }
  result.status = newStatus;

  // ── Synthetic status injection from raw WHOIS text ──────────────────────────
  // Many ccTLD WHOIS servers express domain state as free-form text rather than
  // structured EPP status codes. Detect these patterns and inject synthetic
  // status entries so downstream status detection works correctly.
  {
    const rawLow = data.toLowerCase();
    const hasStatusCode = (code: string) =>
      result.status.some((s) => s.status.toLowerCase().includes(code));

    // ── RESERVED ─────────────────────────────────────────────────────────────
    // Domain is held by the registry and not available for public registration.
    // Sources (non-exhaustive):
    //   TELE-INFO (.yun/.wang/.中文) → "in the reserved list, please contact the registry"
    //   TWNIC (.tw/.com.tw)          → standalone "Reserved" line
    //   NZRS (.nz/.co.nz)            → standalone "reserved" line
    //   DENIC (.de)                  → "% Status: reserviert" (German)
    //   EURID (.eu)                  → "Status: RESERVED"
    //   IIS (.se/.nu)                → "state: reserved"
    //   CZ.NIC (.cz/.sk)             → "rezervovan: ano" (Czech/Slovak)
    //   NIC.AT (.at)                 → "% Domain [x] is reserved."
    //   Donuts / Identity Digital    → "Status: reserved" (EPP field in WHOIS text)
    //   CentralNic / LogicBoxes      → "Status: reserved"
    //   CIRA (.ca)                   → "Status: Reserved"
    //   FICORA (.fi)                 → "Status: Reserved"
    //   CNNIC / Chinese TLD WHOIS    → "保留域名" / "已被保留" / "注册局保留"
    //   Generic ccTLD/new gTLD       → "Reserved for future use" / "reserved for official use"
    //   New gTLD sunrise periods     → "sunrise reserved" / "reserved for sunrise"
    const syntheticReserved =
      !hasStatusCode("reserved") &&
      (// ── English free-text phrases ──────────────────────────────────────
        rawLow.includes("reserved name") ||
        rawLow.includes("this name is reserved") ||
        rawLow.includes("is a reserved name") ||
        rawLow.includes("domain is reserved") ||
        rawLow.includes("this domain is reserved") ||
        rawLow.includes("domain name is reserved") ||
        rawLow.includes("reserved by the registry") ||
        rawLow.includes("registry reserved") ||
        rawLow.includes("reserved-name") ||
        rawLow.includes("reserved domain") ||
        rawLow.includes("in the reserved list") ||
        rawLow.includes("on the reserved list") ||
        rawLow.includes("is in the reserved list") ||
        rawLow.includes("is on the reserved list") ||
        rawLow.includes("has been reserved") ||
        rawLow.includes("name is reserved") ||
        rawLow.includes("is reserved for") ||
        rawLow.includes("is reserved by") ||
        rawLow.includes("reserved for registry") ||
        rawLow.includes("reserved for the registry") ||
        rawLow.includes("registry has reserved") ||
        rawLow.includes("registry hold") ||
        rawLow.includes("held by the registry") ||
        rawLow.includes("domain is held") ||
        rawLow.includes("being held by") ||
        rawLow.includes("reserved for future use") ||
        rawLow.includes("reserved for official use") ||
        rawLow.includes("reserved for this registry") ||
        rawLow.includes("reserved at the registry") ||
        rawLow.includes("sunrise reserved") ||
        rawLow.includes("reserved for sunrise") ||
        rawLow.includes("reserved for landrush") ||
        rawLow.includes("landrush reserved") ||
        // ── Structured field: "status: reserved" / "state: reserved" ────
        // Covers EURID (.eu), IIS (.se/.nu), CIRA (.ca), FICORA (.fi),
        // DNS Polska (.pl), and many new gTLD operators.
        /\bstatus\s*:\s*reserved\b/.test(rawLow) ||
        /\bstate\s*:\s*reserved\b/.test(rawLow) ||
        /\bdomainstatus\s*:\s*reserved\b/.test(rawLow) ||
        // ── German (DENIC .de) ───────────────────────────────────────────
        rawLow.includes("reserviert") ||
        // ── Czech / Slovak (CZ.NIC .cz .sk) ─────────────────────────────
        rawLow.includes("rezervovan") ||
        // ── French ccTLD (AFNIC .fr .re .pm .tf .wf .yt) ────────────────
        rawLow.includes("réservé") ||
        rawLow.includes("reserver") ||
        // ── Spanish / Portuguese ccTLD ────────────────────────────────────
        rawLow.includes("reservado") ||
        // ── Chinese WHOIS (CNNIC, TELE-INFO, ZDNS) ───────────────────────
        rawLow.includes("保留域名") ||
        rawLow.includes("已被保留") ||
        rawLow.includes("注册局保留") ||
        rawLow.includes("保留中") ||
        rawLow.includes("该域名已保留") ||
        // ── standalone "reserved" on its own line (TWNIC / NZRS) ─────────
        /(?:^|\n)\s*reserved\s*(?:\n|$)/.test(rawLow));

    if (syntheticReserved) {
      result.status.push({ status: "registry-reserved", url: "" });
    }

    // ── PREMIUM RESERVED ─────────────────────────────────────────────────────
    // Registry is holding this name for sale at a premium price or via special
    // application / auction.  These get an additional "registry-premium" tag so
    // the UI can show a different, purchase-oriented description.
    // Sources:
    //   Many new gTLD operators    → "Premium" tier during EAP / launch periods
    //   TELE-INFO (.yun/.wang)     → "please contact the registry"
    //   Aftermarket platforms      → "available for purchase" / "make an offer"
    //   Sedo / GoDaddy Auctions    → "this name is available for purchase"
    const syntheticPremiumReserved =
      !hasStatusCode("registry-premium") &&
      (rawLow.includes("premium domain") ||
        rawLow.includes("premium name") ||
        rawLow.includes("premium price") ||
        rawLow.includes("premium pricing") ||
        rawLow.includes("premium listing") ||
        rawLow.includes("registry premium") ||
        rawLow.includes("available at a premium") ||
        rawLow.includes("this is a premium") ||
        rawLow.includes("premium registration") ||
        rawLow.includes("early access program") ||
        rawLow.includes("early access pricing") ||
        rawLow.includes("early access period") ||
        rawLow.includes("available for purchase") ||
        rawLow.includes("available for sale") ||
        rawLow.includes("this name is for sale") ||
        rawLow.includes("domain is for sale") ||
        rawLow.includes("make an offer") ||
        rawLow.includes("aftermarket") ||
        rawLow.includes("reserve price") ||
        rawLow.includes("starting bid") ||
        rawLow.includes("minimum bid") ||
        // "contact the registry/registrar" as purchase call-to-action
        rawLow.includes("please contact the registry") ||
        rawLow.includes("contact the registry to") ||
        rawLow.includes("contact the registry for") ||
        rawLow.includes("contact your registrar to") ||
        rawLow.includes("contact your registrar for") ||
        rawLow.includes("enquire about this domain") ||
        rawLow.includes("inquire about this domain") ||
        rawLow.includes("may be available for purchase") ||
        rawLow.includes("can be acquired") ||
        rawLow.includes("reach out to the registry"));

    if (syntheticPremiumReserved) {
      result.status.push({ status: "registry-premium", url: "" });
    }

    // ── PROHIBITED / BLOCKED ─────────────────────────────────────────────────
    // Domain string is policy-blocked and cannot be registered by anyone.
    // Sources:
    //   ICANN policy       → prohibited strings, brand protection
    //   Registry policy    → sensitive keywords, govt-reserved terms
    //   ccTLD policy       → national policy blocks
    //   DNS abuse lists    → malware / phishing holds
    const syntheticProhibited =
      !hasStatusCode("prohibited") &&
      !hasStatusCode("blocked") &&
      (rawLow.includes("registration is prohibited") ||
        rawLow.includes("registration prohibited") ||
        rawLow.includes("cannot be registered") ||
        rawLow.includes("registration not possible") ||
        rawLow.includes("registration not available") ||
        rawLow.includes("not available for registration") ||
        rawLow.includes("not eligible for registration") ||
        rawLow.includes("not open for registration") ||
        rawLow.includes("not open for general registration") ||
        rawLow.includes("not open to general registrations") ||
        rawLow.includes("not currently open for registration") ||
        rawLow.includes("not available for public registration") ||
        rawLow.includes("not permitted to register") ||
        rawLow.includes("registration is not permitted") ||
        rawLow.includes("registrations are not permitted") ||
        rawLow.includes("registrations not permitted") ||
        rawLow.includes("not accepting registrations") ||
        rawLow.includes("registrations not accepted") ||
        rawLow.includes("no registrations are accepted") ||
        rawLow.includes("does not accept registrations") ||
        rawLow.includes("cannot be publicly registered") ||
        rawLow.includes("prohibited string") ||
        rawLow.includes("prohibited by policy") ||
        rawLow.includes("policy prohibited") ||
        rawLow.includes("not available for public use") ||
        rawLow.includes("registrar banned") ||
        rawLow.includes("registry banned") ||
        rawLow.includes("blacklisted") ||
        rawLow.includes("禁止注册") ||         // Chinese: registration prohibited
        rawLow.includes("不开放注册") ||       // Chinese: not open for registration
        /\bblocked\s+by\s+(?:registry|registrar)\b/.test(rawLow) ||
        /\bregistration\s+blocked\b/.test(rawLow));

    if (syntheticProhibited) {
      result.status.push({ status: "registrationProhibited", url: "" });
    }

    // ── SUSPENDED / HOLD ─────────────────────────────────────────────────────
    // Domain was registered but has been suspended by the registry or registrar.
    // Sources:
    //   Registrar action   → non-payment, policy violation, abuse report
    //   Registry action    → ICANN compliance, court orders, fraud holds
    //   ccTLD policies     → national law enforcement, consumer protection
    const syntheticSuspended =
      !hasStatusCode("suspended") &&
      !hasStatusCode("hold") &&
      (rawLow.includes("suspended by registry") ||
        rawLow.includes("suspended by registrar") ||
        rawLow.includes("registry-suspended") ||
        rawLow.includes("domain is suspended") ||
        rawLow.includes("domain suspended") ||
        rawLow.includes("domain has been suspended") ||
        rawLow.includes("account suspended") ||
        rawLow.includes("abuse suspension") ||
        rawLow.includes("abuse hold") ||
        rawLow.includes("fraud hold") ||
        rawLow.includes("compliance hold") ||
        rawLow.includes("billing suspension") ||
        rawLow.includes("domain is on hold") ||
        rawLow.includes("registrar hold") ||
        rawLow.includes("gesperrt") ||          // German: locked/blocked (DENIC .de)
        rawLow.includes("suspendido") ||        // Spanish: suspended
        rawLow.includes("suspendu") ||          // French: suspended
        rawLow.includes("已暂停") ||            // Chinese: already suspended
        rawLow.includes("域名暂停") ||          // Chinese: domain suspended
        // standalone "suspended" on its own line
        /(?:^|\n)\s*suspended\s*(?:\n|$)/.test(rawLow));

    if (syntheticSuspended) {
      result.status.push({ status: "suspended", url: "" });
    }
  }

  const seenNS = new Set<string>();
  result.nameServers = result.nameServers.filter((ns) => {
    const nsKey = ns.toLowerCase().trim();
    if (!nsKey || seenNS.has(nsKey)) return false;
    seenNS.add(nsKey);
    return true;
  });

  if (result.creationDate === "Unknown") {
    const fallback = extractDateNearKeyword(data, [
      "creat", "registered", "activation", "anniversary", "inception",
      "enregistr", "registro", "criado",
    ]);
    if (fallback) result.creationDate = fallback;
  }

  if (result.expirationDate === "Unknown") {
    const fallback = extractDateNearKeyword(data, [
      "expir", "valid until", "paid-till", "paid till", "renewal",
      "due date", "venc", "ablauf", "validade",
    ]);
    if (fallback) result.expirationDate = fallback;
  }

  if (result.updatedDate === "Unknown") {
    const fallback = extractDateNearKeyword(data, [
      "updated", "modified", "last change", "last update", "mise à jour",
      "mise a jour", "modificat", "actualiz",
    ]);
    if (fallback) result.updatedDate = fallback;
  }

  if (explicitUnicodeDomain) {
    result.domain = explicitUnicodeDomain;
    if (explicitAsciiDomain) {
      result.domainPunycode = explicitAsciiDomain.toUpperCase();
    } else if (result.domain) {
      const punycheck = convertIdnToUnicode(result.domain);
      if (punycheck.punycode) result.domainPunycode = punycheck.punycode;
    }
  } else if (result.domain) {
    const converted = convertIdnToUnicode(result.domain);
    if (converted.punycode) {
      result.domainPunycode = converted.punycode;
      result.domain = converted.unicode;
    }
  }

  return await applyParams(result);
}
