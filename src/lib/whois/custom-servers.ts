import fs from "fs";
import path from "path";
import { many, run, isDbReady } from "@/lib/db-query";

export type TcpServerEntry = {
  type: "tcp";
  host: string;
  port?: number;
};

export type HttpServerEntry = {
  type: "http";
  url: string;
  method?: "GET" | "POST";
  body?: string;
};

/**
 * Scraper entry: a TLD handled by a custom scraper function (e.g. nic.ba).
 * The scraper name maps to a dedicated module in src/lib/whois/http-scrapers/.
 * registryUrl is shown to users when automated lookup is unavailable.
 */
export type ScraperEntry = {
  type: "scraper";
  name: string;
  registryUrl: string;
};

export type CustomServerEntry = string | TcpServerEntry | HttpServerEntry | ScraperEntry;

export type CustomServerMap = Record<string, CustomServerEntry>;

const CCTLD_FILE = path.join(process.cwd(), "src/data/cctld-whois-servers.json");
const DATA_FILE  = path.join(process.cwd(), "src/data/custom-tld-servers.json");

function readCctldServers(): Record<string, string | null> {
  try {
    return JSON.parse(fs.readFileSync(CCTLD_FILE, "utf-8")) as Record<string, string | null>;
  } catch {
    return {};
  }
}

const BUILTIN_SERVERS: CustomServerMap = {
  bn: "whois.bnnic.bn",
  ba:      { type: "scraper", name: "nic-ba", registryUrl: "https://www.nic.ba/?culture=en&handler=DomainSearch" },
  "com.ba":{ type: "scraper", name: "nic-ba", registryUrl: "https://www.nic.ba/?culture=en&handler=DomainSearch" },
  "org.ba":{ type: "scraper", name: "nic-ba", registryUrl: "https://www.nic.ba/?culture=en&handler=DomainSearch" },
  "net.ba":{ type: "scraper", name: "nic-ba", registryUrl: "https://www.nic.ba/?culture=en&handler=DomainSearch" },
  "gov.ba":{ type: "scraper", name: "nic-ba", registryUrl: "https://www.nic.ba/?culture=en&handler=DomainSearch" },
  "edu.ba":{ type: "scraper", name: "nic-ba", registryUrl: "https://www.nic.ba/?culture=en&handler=DomainSearch" },
  "mil.ba":{ type: "scraper", name: "nic-ba", registryUrl: "https://www.nic.ba/?culture=en&handler=DomainSearch" },
};

function readFileServers(): CustomServerMap {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as CustomServerMap;
  } catch {
    return {};
  }
}

async function readDbServers(): Promise<CustomServerMap> {
  if (!(await isDbReady())) return {};
  try {
    const rows = await many<{ tld: string; entry: unknown }>(
      "SELECT tld, entry FROM custom_whois_servers ORDER BY tld",
    );
    const map: CustomServerMap = {};
    for (const r of rows) {
      map[r.tld] = r.entry as CustomServerEntry;
    }
    return map;
  } catch {
    return {};
  }
}

async function readUserManagedServers(): Promise<CustomServerMap> {
  const fromDb = await readDbServers();
  if (Object.keys(fromDb).length > 0) return fromDb;
  return readFileServers();
}

let _allServersCache: CustomServerMap | null = null;
let _allServersCacheAt = 0;
const ALL_SERVERS_TTL_MS = 30_000;

function invalidateAllServersCache() {
  _allServersCache = null;
  _allServersCacheAt = 0;
}

async function writeDbServer(tld: string, entry: CustomServerEntry): Promise<void> {
  if (!(await isDbReady())) return;
  await run(
    `INSERT INTO custom_whois_servers (tld, entry, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (tld) DO UPDATE SET entry = $2::jsonb, updated_at = NOW()`,
    [tld, JSON.stringify(entry)],
  );
}

async function deleteDbServer(tld: string): Promise<void> {
  if (!(await isDbReady())) return;
  await run("DELETE FROM custom_whois_servers WHERE tld = $1", [tld]);
}

export async function getAllCustomServers(): Promise<CustomServerMap> {
  const now = Date.now();
  if (_allServersCache && now - _allServersCacheAt < ALL_SERVERS_TTL_MS) {
    return _allServersCache;
  }
  const cctld = readCctldServers();
  const user  = await readUserManagedServers();
  const cctldFiltered = Object.fromEntries(
    Object.entries(cctld).filter(([, v]) => v !== null),
  ) as CustomServerMap;
  _allServersCache = { ...BUILTIN_SERVERS, ...cctldFiltered, ...user };
  _allServersCacheAt = now;
  return _allServersCache;
}

export async function getUserManagedServers(): Promise<CustomServerMap> {
  return readUserManagedServers();
}

export async function getCustomServerEntry(tld: string): Promise<CustomServerEntry | null> {
  const all = await getAllCustomServers();
  const normalized = tld.toLowerCase().replace(/^\./, "");
  return all[normalized] ?? null;
}

export async function getCustomServer(tld: string): Promise<string | null> {
  const entry = await getCustomServerEntry(tld);
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (entry.type === "tcp") return entry.host;
  return null;
}

export async function setCustomServer(tld: string, entry: CustomServerEntry): Promise<void> {
  const normalized = tld.toLowerCase().replace(/^\./, "");
  await writeDbServer(normalized, entry);
  invalidateAllServersCache();
}

export async function deleteCustomServer(tld: string): Promise<boolean> {
  const normalized = tld.toLowerCase().replace(/^\./, "");
  const servers = await readUserManagedServers();
  if (normalized in servers) {
    await deleteDbServer(normalized);
    invalidateAllServersCache();
    return true;
  }
  return false;
}

export async function isUserManagedServer(tld: string): Promise<boolean> {
  const normalized = tld.toLowerCase().replace(/^\./, "");
  const userServers = await readUserManagedServers();
  return normalized in userServers;
}

export function isHttpEntry(entry: CustomServerEntry): entry is HttpServerEntry {
  return typeof entry === "object" && entry.type === "http";
}

export function isScraperEntry(entry: CustomServerEntry): entry is ScraperEntry {
  return typeof entry === "object" && entry.type === "scraper";
}

export function isTcpEntry(entry: CustomServerEntry): entry is TcpServerEntry | string {
  if (typeof entry === "string") return true;
  return typeof entry === "object" && entry.type === "tcp";
}

export function getTcpHost(entry: CustomServerEntry): string | null {
  if (typeof entry === "string") return entry;
  if (typeof entry === "object" && entry.type === "tcp") return entry.host;
  return null;
}
