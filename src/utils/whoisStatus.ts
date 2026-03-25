// src/utils/whoisStatus.ts
export type WhoisDecision = {
  prohibited: boolean;
  reason?: string;
  matched?: string[];
};

interface TldRule {
  treatAsProhibit?: string[];
}

// EPP lock/protection statuses whose names contain "prohibited" but do NOT
// indicate that the domain is unavailable for registration. They protect an
// already-registered domain from unwanted operations (delete / transfer /
// renew / update). Both camelCase and hyphenated variants are included.
const EPP_LOCK_STATUS_PATTERNS: RegExp[] = [
  /^client(Delete|Transfer|Renew|Update)Prohibited$/i,
  /^server(Delete|Transfer|Renew|Update)Prohibited$/i,
  /^client-(delete|transfer|renew|update)-prohibited$/i,
  /^server-(delete|transfer|renew|update)-prohibited$/i,
  // also the normalised (all-lower, no-separator) forms
  /^client(delete|transfer|renew|update)prohibited$/i,
  /^server(delete|transfer|renew|update)prohibited$/i,
];

// Patterns in raw WHOIS text that represent EPP lock status lines and should
// be stripped before scanning for genuine prohibition keywords.
const EPP_LOCK_LINE_PATTERNS: RegExp[] = [
  /client\s*(delete|transfer|renew|update)\s*prohibited/gi,
  /server\s*(delete|transfer|renew|update)\s*prohibited/gi,
];

// Patterns that indicate a genuine registration prohibition (not EPP locks).
const explicitProhibitPatterns: RegExp[] = [
  /禁止注册/i,
  /\breserved\b/i,
  /\bprohibit(ed|ion)?\b/i,
  /\bforbid(den)?\b/i,
  /\bblocked\b/i,
  /not available/i,
  /reserved by/i,
  /registry reserved/i,
  /cannot be registered/i,
  /not available for registration/i,
  /\bineligible\b/i,
  /registration\s*prohibited/i,
  /registry[- ]banned/i,
];

// Parsed status codes that should never trigger a prohibition decision on
// their own — they are protective flags for registered domains.
const statusIgnoreAsProhibit = new Set<string>([
  'clientDeleteProhibited',
  'clientTransferProhibited',
  'clientRenewProhibited',
  'clientHold',
  'clientUpdateProhibited',
  'serverHold',
  'serverDeleteProhibited',
  'serverTransferProhibited',
  'serverRenewProhibited',
  'serverUpdateProhibited',
  // lower-cased normalised forms
  'clientdeleteprohibited',
  'clienttransferprohibited',
  'clientrenewprohibited',
  'clientupdateprohibited',
  'serverdeleteprohibited',
  'servertransferprohibited',
  'serverrenewprohibited',
  'serverupdateprohibited',
  // hyphenated forms
  'client-delete-prohibited',
  'client-transfer-prohibited',
  'client-renew-prohibited',
  'client-update-prohibited',
  'server-delete-prohibited',
  'server-transfer-prohibited',
  'server-renew-prohibited',
  'server-update-prohibited',
]);

// Per-TLD overrides — add entries to mark specific TLD status strings as
// genuine prohibitions that the generic patterns would otherwise miss.
const tldExceptions: Record<string, TldRule | undefined> = {
  // example:
  // 'example': { treatAsProhibit: ['someCustomStatus'] },
};

function isEppLockStatus(s: string): boolean {
  return EPP_LOCK_STATUS_PATTERNS.some((re) => re.test(s));
}

/**
 * Strips EPP lock status lines from raw WHOIS text so that the word
 * "prohibited" inside e.g. "clientTransferProhibited" does not trigger a
 * false positive when scanning for registration-prohibition keywords.
 */
function stripEppLockLines(raw: string): string {
  let cleaned = raw;
  for (const re of EPP_LOCK_LINE_PATTERNS) {
    cleaned = cleaned.replace(re, '');
  }
  return cleaned;
}

export function decideProhibitedRegistration(
  rawWhois: string,
  parsedStatuses: string[] = [],
  tld: string | null = null
): WhoisDecision {
  const matched: string[] = [];

  // 1) Scan raw WHOIS text — but first strip EPP lock status lines so that
  //    "clientTransferProhibited" does not falsely trigger /\bprohibited\b/.
  const cleanedRaw = stripEppLockLines(rawWhois || '');
  for (const re of explicitProhibitPatterns) {
    if (re.test(cleanedRaw)) {
      matched.push(`raw:${re.source}`);
    }
  }

  // 2) Check parsed status codes. Ignore known EPP lock statuses entirely.
  const key = tld ? tld.toLowerCase() : '';
  const tldRule = key ? tldExceptions[key] : undefined;

  for (const s of parsedStatuses) {
    if (!s) continue;
    const sNorm = s.trim();

    // Skip known EPP protective lock statuses.
    if (statusIgnoreAsProhibit.has(sNorm) || statusIgnoreAsProhibit.has(sNorm.toLowerCase())) continue;
    if (isEppLockStatus(sNorm)) continue;

    // Per-TLD overrides can force a status to be treated as prohibited.
    if (
      tldRule &&
      Array.isArray(tldRule.treatAsProhibit) &&
      tldRule.treatAsProhibit.some((x) => x.toLowerCase() === sNorm.toLowerCase())
    ) {
      matched.push(`status:${sNorm}`);
      continue;
    }

    for (const re of explicitProhibitPatterns) {
      if (re.test(sNorm)) {
        matched.push(`status:${sNorm}`);
        break;
      }
    }
  }

  if (matched.length > 0) {
    return {
      prohibited: true,
      reason: 'matched explicit reserve/prohibit keywords',
      matched,
    };
  }

  // 3) If only protective EPP flags exist and no prohibition signal was found,
  //    the domain is registered (not prohibited).
  const protective = parsedStatuses.filter(
    (s) => s && (statusIgnoreAsProhibit.has(s) || statusIgnoreAsProhibit.has(s.toLowerCase()) || isEppLockStatus(s))
  );
  if (protective.length > 0) {
    return {
      prohibited: false,
      reason: 'registry-protective-statuses-only',
      matched: protective.map((s) => `protective:${s}`),
    };
  }

  // 4) Default: not prohibited.
  return { prohibited: false, reason: 'no-prohibit-keyword-found', matched: [] };
}
