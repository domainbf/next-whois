const NAZHUMI_API_URL = "https://www.nazhumi.com/api/v1";
const MIQINGJU_API_URL = "https://api.miqingju.com/api/v1/query";

type NazhumiOrder = "new" | "renew" | "transfer";

interface NazhumiRegistrar {
  registrar: string;
  registrarname: string;
  registrarweb: string;
  new: number | "n/a";
  renew: number | "n/a";
  transfer: number | "n/a";
  currency: string;
  currencyname: string;
  currencytype: string;
  promocode: boolean;
  updatedtime: string;
}

interface NazhumiResponse {
  domain: string;
  order: "new" | "renew" | "transfer";
  count: number;
  price: NazhumiRegistrar[];
}

interface MiqingjuEntry {
  type: "registration" | "renewal" | "transfer";
  registrar: string;
  website: string;
  logo: string;
  tld: string;
  price: number;
  currency: string;
  price_cny: number;
}

interface MiqingjuResponse {
  success: boolean;
  timestamp: string;
  data: MiqingjuEntry[];
}

export interface DomainPricing extends NazhumiRegistrar {
  isPremium: boolean;
  externalLink: string;
}

const MQ_TYPE_MAP: Record<NazhumiOrder, string> = {
  new: "registration",
  renew: "renewal",
  transfer: "transfer",
};

function registrarKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.(com|net|org|io|co|biz|info|cn)$/i, "")
    .replace(/[\s\-_.]+/g, "");
}

async function fetchNazhumiData(
  tld: string,
  type: NazhumiOrder,
): Promise<NazhumiRegistrar[]> {
  try {
    const url = `${NAZHUMI_API_URL}?domain=${encodeURIComponent(tld)}&order=${type}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const res = await response.json();
    const data: NazhumiResponse | undefined = res.data;
    if (!data || !Array.isArray(data.price) || data.price.length === 0) return [];
    return data.price;
  } catch {
    return [];
  }
}

async function fetchMiqingjuData(
  tld: string,
  type: NazhumiOrder,
): Promise<NazhumiRegistrar[]> {
  try {
    const mqType = MQ_TYPE_MAP[type];
    const url = `${MIQINGJU_API_URL}?tld=${encodeURIComponent(tld)}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const json: MiqingjuResponse = await response.json();
    if (!json.success || !Array.isArray(json.data)) return [];

    return json.data
      .filter((r) => r.type === mqType && typeof r.price === "number")
      .map((r) => ({
        registrar: r.registrar,
        registrarname: r.registrar,
        registrarweb: r.website ?? "",
        new: type === "new" ? r.price : "n/a",
        renew: type === "renew" ? r.price : "n/a",
        transfer: type === "transfer" ? r.price : "n/a",
        currency: (r.currency ?? "USD").toUpperCase(),
        currencyname: r.currency ?? "USD",
        currencytype: "standard",
        promocode: false,
        updatedtime: "",
      }));
  } catch {
    return [];
  }
}

function mergeRegistrars(
  nazhumi: NazhumiRegistrar[],
  miqingju: NazhumiRegistrar[],
  type: NazhumiOrder,
): NazhumiRegistrar[] {
  const map = new Map<string, NazhumiRegistrar>();

  for (const r of nazhumi) {
    const key = registrarKey(r.registrarname || r.registrar);
    if (key) map.set(key, r);
  }

  for (const r of miqingju) {
    const key = registrarKey(r.registrarname || r.registrar);
    if (!key) continue;
    if (map.has(key)) {
      const existing = map.get(key)!;
      const ePrice = typeof existing[type] === "number" ? (existing[type] as number) : Infinity;
      const mPrice = typeof r[type] === "number" ? (r[type] as number) : Infinity;
      if (mPrice < ePrice) {
        map.set(key, { ...existing, [type]: r[type] });
      }
    } else {
      map.set(key, r);
    }
  }

  return Array.from(map.values()).filter((r) => typeof r[type] === "number");
}

function calcIsPremium(r: NazhumiRegistrar): boolean {
  return (
    typeof r.new === "number" &&
    r.new > 100 &&
    ["usd", "eur", "cad"].includes(r.currency.toLowerCase())
  );
}

export async function getDomainPricing(
  domain: string,
  type: NazhumiOrder,
): Promise<DomainPricing | null> {
  try {
    const tld = domain
      .substring(domain.lastIndexOf(".") + 1)
      .replace("www.", "")
      .toLowerCase()
      .trim();

    const [nazhumiData, miqingjuData] = await Promise.all([
      fetchNazhumiData(tld, type),
      fetchMiqingjuData(tld, type),
    ]);

    const merged = mergeRegistrars(nazhumiData, miqingjuData, type);
    if (merged.length === 0) return null;

    merged.sort((a, b) => {
      const av = typeof a[type] === "number" ? (a[type] as number) : Infinity;
      const bv = typeof b[type] === "number" ? (b[type] as number) : Infinity;
      return av - bv;
    });

    const best = merged[0];
    return {
      ...best,
      isPremium: calcIsPremium(best),
      externalLink: `https://www.nazhumi.com/domain/${tld}/${type}`,
    };
  } catch (error) {
    console.error("Error fetching domain pricing:", error);
    return null;
  }
}

export async function getTopRegistrars(
  domain: string,
  type: NazhumiOrder,
  count = 3,
): Promise<DomainPricing[]> {
  try {
    const tld = domain
      .substring(domain.lastIndexOf(".") + 1)
      .replace("www.", "")
      .toLowerCase()
      .trim();

    const [nazhumiData, miqingjuData] = await Promise.all([
      fetchNazhumiData(tld, type),
      fetchMiqingjuData(tld, type),
    ]);

    const merged = mergeRegistrars(nazhumiData, miqingjuData, type);

    return merged
      .filter((r) => typeof r[type] === "number")
      .sort((a, b) => {
        const av = typeof a[type] === "number" ? (a[type] as number) : Infinity;
        const bv = typeof b[type] === "number" ? (b[type] as number) : Infinity;
        return av - bv;
      })
      .slice(0, count)
      .map((r) => ({
        ...r,
        isPremium: calcIsPremium(r),
        externalLink: `https://www.nazhumi.com/domain/${tld}/${type}`,
      }));
  } catch {
    return [];
  }
}
