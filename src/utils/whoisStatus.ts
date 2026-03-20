export type WhoisDecision = {
  prohibited: boolean;
  reason?: string;
  matched?: string[];
};

const explicitProhibitPatterns: RegExp[] = [
  /禁止注册/i,
  /\breserved\b/i,
  /\bprohibit(ed|ion)?\b/i,
  /\bforbid(den)?\b/i,
  /\bblocked\b/i,
  /not available/i,
  /reserved by/i,
  /registry reserved/i,
];

const statusIgnoreAsProhibit = new Set<string>([
  'clientDeleteProhibited',
  'clientTransferProhibited',
  'clientRenewProhibited',
  'clientHold',
  'clientUpdateProhibited',
  'serverHold',
]);

const tldExceptions: Record<string, { treatAsProhibit?: string[] }> = {
  // per-TLD overrides, example:
  // 'example': { treatAsProhibit: ['serverHold'] },
};

export function decideProhibitedRegistration(
  rawWhois: string,
  parsedStatuses: string[] = [],
  tld: string | null = null
): WhoisDecision {
  const matched: string[] = [];

  // 1) check raw text for explicit prohibit/reserved keywords
  for (const re of explicitProhibitPatterns) {
    if (re.test(rawWhois)) {
      matched.push(`raw:${re.source}`);
    }
  }

  // 2) check parsed statuses and tld exception rules
  const tldRule = tld && tldExceptions[tld.toLowerCase()];
  for (const s of parsedStatuses) {
    if (!s) continue;
    const sNorm = s.trim();

    if (tldRule?.treatAsProhibit?.some(x => x.toLowerCase() === sNorm.toLowerCase())) {
      matched.push(`status:${sNorm}`);
      continue;
    }

    for (const re of explicitProhibitPatterns) {
      if (re.test(sNorm)) {
        matched.push(`status:${sNorm}`);
        break;
      }
    }

    if (/\breserved\b|\bblocked\b|\bprohibit\b/i.test(sNorm)) {
      matched.push(`status:${sNorm}`);
    }
  }

  if (matched.length > 0) {
    return { prohibited: true, reason: 'matched explicit reserve/prohibit keywords', matched };
  }

  // 3) if only protective flags exist, do not treat as prohibited
  const protective = parsedStatuses.filter(s => s && statusIgnoreAsProhibit.has(s));
  if (protective.length > 0) {
    return { prohibited: false, reason: 'registry-protective-statuses-only', matched: protective.map(s => `protective:${s}`) };
  }

  // 4) default: not prohibited
  return { prohibited: false, reason: 'no-prohibit-keyword-found', matched: [] };
}
