const NAZHUMI_API_URL = "https://www.nazhumi.com/api/v1";

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

export interface DomainPricing extends NazhumiRegistrar {
  isPremium: boolean;
  externalLink: string;
}

const defaultDomainPricing: DomainPricing = {
  registrar: "Unknown",
  registrarname: "Unknown",
  registrarweb: "Unknown",
  new: -1,
  renew: -1,
  transfer: -1,
  currency: "Unknown",
  currencyname: "Unknown",
  currencytype: "Unknown",
  promocode: false,
  updatedtime: "Unknown",
  isPremium: false,
  externalLink: "",
};

async function fetchNazhumiData(
  tld: string,
  type: NazhumiOrder,
): Promise<NazhumiResponse | null> {
  try {
    const url = `${NAZHUMI_API_URL}?domain=${encodeURIComponent(tld)}&order=${type}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const data: NazhumiResponse | undefined = await response
      .json()
      .then((res) => res.data);
    if (!data || !Array.isArray(data.price) || data.price.length === 0)
      return null;
    return data;
  } catch {
    return null;
  }
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
    const data = await fetchNazhumiData(tld, type);
    if (!data) return null;
    const registrar = data.price[0];
    return {
      ...registrar,
      isPremium:
        typeof registrar.new === "number" &&
        registrar.new > 100 &&
        ["usd", "eur", "cad"].includes(registrar.currency.toLowerCase()),
      externalLink: `https://www.nazhumi.com/domain/${domain}/${type}`,
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
    const data = await fetchNazhumiData(tld, type);
    if (!data) return [];
    return data.price
      .filter((r) => typeof r[type] === "number")
      .sort((a, b) => {
        const av = typeof a[type] === "number" ? (a[type] as number) : Infinity;
        const bv = typeof b[type] === "number" ? (b[type] as number) : Infinity;
        return av - bv;
      })
      .slice(0, count)
      .map((r) => ({
        ...r,
        isPremium:
          typeof r.new === "number" &&
          r.new > 100 &&
          ["usd", "eur", "cad"].includes(r.currency.toLowerCase()),
        externalLink: `https://www.nazhumi.com/domain/${tld}/new`,
      }));
  } catch {
    return [];
  }
}
