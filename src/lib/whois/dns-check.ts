import dns from "dns/promises";
import https from "https";
import { extractDomain } from "@/lib/utils";

export type DnsProbeResult = {
  domain: string;
  registrationStatus: "registered" | "unregistered" | "unknown";
  confidence: "high" | "medium" | "low";
  signals: DnsSignal[];
  nameservers: string[];
  ipv4: string[];
  ipv6: string[];
  mx: string[];
  hasSsl: boolean | null;
};

export type DnsSignal = {
  type: string;
  value: string;
  label: string;
};

const DNS_TIMEOUT_MS = 5000;

function withDnsTimeout<T>(promise: Promise<T>): Promise<T | null> {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), DNS_TIMEOUT_MS)),
  ]);
}

async function checkSsl(domain: string): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 4000);
    const req = https.request(
      { hostname: domain, port: 443, method: "HEAD", path: "/", timeout: 3500 },
      () => {
        clearTimeout(timeout);
        resolve(true);
      },
    );
    req.on("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });
    req.on("timeout", () => {
      clearTimeout(timeout);
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

export async function probeDomain(input: string): Promise<DnsProbeResult> {
  const domain = extractDomain(input) || input;

  const [nsResult, aResult, aaaaResult, mxResult] = await Promise.all([
    withDnsTimeout(dns.resolveNs(domain)),
    withDnsTimeout(dns.resolve4(domain)),
    withDnsTimeout(dns.resolve6(domain)),
    withDnsTimeout(dns.resolveMx(domain)),
  ]);

  const nameservers = nsResult ?? [];
  const ipv4 = aResult ?? [];
  const ipv6 = aaaaResult ?? [];
  const mx = mxResult ? mxResult.map((r) => r.exchange) : [];

  const hasAny = nameservers.length > 0 || ipv4.length > 0 || ipv6.length > 0 || mx.length > 0;

  let hasSsl: boolean | null = null;
  if (ipv4.length > 0 || ipv6.length > 0) {
    hasSsl = await checkSsl(domain);
  }

  const signals: DnsSignal[] = [];
  if (nameservers.length > 0) {
    signals.push({ type: "NS", value: nameservers[0], label: `NS: ${nameservers.slice(0, 2).join(", ")}` });
  }
  if (ipv4.length > 0) {
    signals.push({ type: "A", value: ipv4[0], label: `A: ${ipv4.slice(0, 2).join(", ")}` });
  }
  if (ipv6.length > 0) {
    signals.push({ type: "AAAA", value: ipv6[0], label: `AAAA: ${ipv6[0]}` });
  }
  if (mx.length > 0) {
    signals.push({ type: "MX", value: mx[0], label: `MX: ${mx.slice(0, 2).join(", ")}` });
  }
  if (hasSsl !== null) {
    signals.push({ type: "SSL", value: String(hasSsl), label: hasSsl ? "SSL: 证书有效" : "SSL: 无响应" });
  }

  let registrationStatus: DnsProbeResult["registrationStatus"] = "unknown";
  let confidence: DnsProbeResult["confidence"] = "low";

  if (nameservers.length > 0) {
    registrationStatus = "registered";
    confidence = "high";
  } else if (ipv4.length > 0 || ipv6.length > 0 || mx.length > 0) {
    registrationStatus = "registered";
    confidence = "medium";
  } else if (hasAny === false) {
    registrationStatus = "unregistered";
    confidence = "medium";
  }

  return {
    domain,
    registrationStatus,
    confidence,
    signals,
    nameservers,
    ipv4,
    ipv6,
    mx,
    hasSsl,
  };
}
