/**
 * HTTP WHOIS scraper for .ba ccTLD (Bosnia and Herzegovina)
 * Registry: UTIC (University Tele-Informatic Center)
 * Website: https://www.nic.ba
 *
 * Technical situation:
 * - TCP WHOIS (port 43) to whois.nic.ba is blocked/filtered from non-BA IPs
 * - RDAP: not in IANA bootstrap, no public RDAP endpoint
 * - HTTP interface at nic.ba requires Google reCAPTCHA v2 (server-side validated)
 *   → automated access is not possible without a valid reCAPTCHA token
 *
 * This scraper attempts the nic.ba form submission. If reCAPTCHA blocks the
 * result, it returns a structured error so the caller can fall back to
 * DNS-based detection and show a manual lookup link.
 */

const NIC_BA_BASE = "https://www.nic.ba";
const NIC_BA_SEARCH = `${NIC_BA_BASE}/?culture=en&handler=DomainSearch`;

export type NicBaResult =
  | { success: true; registrar: string; status: string; nameservers: string[]; raw: string }
  | { success: false; blocked: boolean; reason: string };

function extractCsrfToken(html: string): string | null {
  const m = html.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/);
  return m ? m[1] : null;
}

function extractAntiforgeryCookie(setCookieHeaders: string[]): string | null {
  for (const h of setCookieHeaders) {
    const m = h.match(/(\.AspNetCore\.Antiforgery\.[^=]+=\S+?)(?:;|$)/);
    if (m) return m[1].replace(/;.*/, "").trim();
  }
  return null;
}

function parseDomainResult(html: string, domainName: string): Omit<NicBaResult & { success: true }, "success"> | null {
  const lower = html.toLowerCase();

  // Detect reCAPTCHA failure
  if (lower.includes("error validating recaptcha")) {
    return null;
  }

  // Look for domain availability / registration info
  // nic.ba shows results in the page after successful submission
  const isAvailable =
    lower.includes("is available") ||
    lower.includes("domain is free") ||
    lower.includes("je slobodan") ||
    lower.includes("dostupan je");

  const isTaken =
    lower.includes("already registered") ||
    lower.includes("is registered") ||
    lower.includes("already taken") ||
    lower.includes("je registrovan") ||
    lower.includes("zauzet je");

  if (!isAvailable && !isTaken) return null;

  // Try to extract nameservers
  const nsMatches = html.match(/(?:ns\d*\.|nameserver)[^<"]*\.(?:ba|net|com|org)[^<"<>]*/gi) || [];
  const nameservers = Array.from(new Set(nsMatches.map((s) => s.trim()))).slice(0, 4);

  // Try to extract registrar
  const registrarMatch = html.match(/(?:registrar|registrant)[^<]*:\s*<[^>]+>([^<]+)/i);
  const registrar = registrarMatch ? registrarMatch[1].trim() : "Unknown";

  const status = isAvailable ? "Available" : "Registered";
  const raw = `Domain Name: ${domainName}.ba\nStatus: ${status}\nRegistry: UTIC (.ba)\nManual Lookup: ${NIC_BA_SEARCH}`;

  return { registrar, status, nameservers, raw };
}

export async function lookupNicBa(
  domain: string,
  timeoutMs = 12000,
): Promise<NicBaResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Parse domain into name + extension
  const parts = domain.toLowerCase().split(".");
  const ext = parts.length >= 3
    ? "." + parts.slice(1).join(".")   // e.g. com.ba, org.ba
    : ".ba";
  const name = parts[0];

  try {
    // Step 1: GET the search page to obtain session cookie + CSRF token
    const getResp = await fetch(NIC_BA_SEARCH, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!getResp.ok) {
      return {
        success: false,
        blocked: false,
        reason: `GET request failed with HTTP ${getResp.status}`,
      };
    }

    const html = await getResp.text();
    const csrfToken = extractCsrfToken(html);
    if (!csrfToken) {
      return {
        success: false,
        blocked: false,
        reason: "Could not extract CSRF token from nic.ba page",
      };
    }

    // Extract session cookie from the response
    const rawCookies = getResp.headers.getSetCookie
      ? getResp.headers.getSetCookie()
      : [getResp.headers.get("set-cookie") || ""];
    const antiforgeryCookie = extractAntiforgeryCookie(rawCookies);
    if (!antiforgeryCookie) {
      return {
        success: false,
        blocked: false,
        reason: "Could not extract anti-forgery cookie from nic.ba",
      };
    }

    // Step 2: POST domain search with CSRF token + cookie
    const body = new URLSearchParams({
      "Input.DomainName": name,
      "Input.DomainExtension": ext,
      "g-recaptcha-response": "",
      "__RequestVerificationToken": csrfToken,
    });

    const postResp = await fetch(NIC_BA_SEARCH, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: NIC_BA_SEARCH,
        Cookie: antiforgeryCookie,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: body.toString(),
    });

    if (!postResp.ok) {
      return {
        success: false,
        blocked: false,
        reason: `POST request failed with HTTP ${postResp.status}`,
      };
    }

    const resultHtml = await postResp.text();
    const parsed = parseDomainResult(resultHtml, name);

    if (!parsed) {
      // reCAPTCHA blocked the result - this is expected behavior
      return {
        success: false,
        blocked: true,
        reason:
          "nic.ba requires CAPTCHA verification for WHOIS lookups. " +
          "Automated access is blocked by Google reCAPTCHA v2.",
      };
    }

    return { success: true, ...parsed };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      blocked: false,
      reason: `Request error: ${msg}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build the manual lookup URL for nic.ba
 * Users can open this link to manually check domain WHOIS.
 */
export function buildNicBaUrl(domain: string): string {
  return NIC_BA_SEARCH;
}
