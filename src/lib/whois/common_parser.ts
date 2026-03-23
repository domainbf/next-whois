import {
  DomainStatusProps,
  initialWhoisAnalyzeResult,
  WhoisAnalyzeResult,
} from "@/lib/whois/types";
import { includeArgs } from "@/lib/utils";
import moment from "moment";
import { domainToUnicode } from "url";
import { getMozMetrics } from "@/lib/moz/client";
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

  // Run pricing and Moz metrics in parallel
  const [registerPrice, renewPrice, negotiable, mozMetrics] = await Promise.all([
    getDomainPricing(result.domain, "new"),
    getDomainPricing(result.domain, "renew"),
    getDomainTransferNegotiable(result.domain),
    getMozMetrics(result.domain),
  ]);
  // Sync isPremium flag with negotiable status:
  // High-value domains (negotiable=true) should be flagged as premium on pricing
  // so UI correctly colors prices and shows premium indicators.
  result.registerPrice = registerPrice
    ? { ...registerPrice, isPremium: negotiable === true || registerPrice.isPremium }
    : null;
  result.renewPrice = renewPrice
    ? { ...renewPrice, isPremium: negotiable === true || renewPrice.isPremium }
    : null;
  result.negotiable = negotiable;
  result.mozDomainAuthority = mozMetrics.domainAuthority;
  result.mozPageAuthority = mozMetrics.pageAuthority;
  result.mozSpamScore = mozMetrics.spamScore;

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
