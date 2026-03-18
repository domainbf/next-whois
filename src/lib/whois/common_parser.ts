import {
  DomainStatusProps,
  initialWhoisAnalyzeResult,
  WhoisAnalyzeResult,
} from "@/lib/whois/types";
import { includeArgs } from "@/lib/utils";
import moment from "moment";
import { getMozMetrics } from "@/lib/moz/client";
import { getDomainPricing } from "@/lib/pricing/client";

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

function analyzeTime(time: string): string {
  if (!time || time.length === 0) return time;

  try {
    const date = new Date(time.replace("<", "").replace(">", "").trim());
    return date.toISOString();
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

  // Get pricing information
  result.registerPrice = await getDomainPricing(result.domain, "new");
  result.renewPrice = await getDomainPricing(result.domain, "renew");
  result.transferPrice = await getDomainPricing(result.domain, "transfer");

  // Get Moz metrics
  const mozMetrics = await getMozMetrics(result.domain);
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
      case "domain name":
      case "domain":
        result.domain = value;
        break;
      case "registrar":
      case "authorized agency":
      case "sponsoring registrar":
        result.registrar = value;
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
        result.updatedDate = analyzeTime(value);
        break;
      case "changed":
        result.updatedDate = analyzeTime(value);
        break;
      case "creation date":
      case "registered date":
      case "activation":
      case "activation date":
      case "registered on":
      case "date registered":
      case "domain registered":
        result.creationDate = analyzeTime(value);
        break;
      case "domain name commencement date":
        result.creationDate = analyzeTime(value);
        break;
      case "expiration date":
      case "expiration":
      case "valid until":
      case "paid-till":
      case "expires on":
      case "expire date":
      case "expire":
        result.expirationDate = analyzeTime(value);
        break;
      case "registrar registration expiration date":
        result.expirationDate = analyzeTime(value);
        break;
      case "registry expiry date":
        result.expirationDate = analyzeTime(value);
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
    const key = ns.toLowerCase().trim();
    if (!key || seenNS.has(key)) return false;
    seenNS.add(key);
    return true;
  });

  return await applyParams(result);
}
