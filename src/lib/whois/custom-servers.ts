import fs from "fs";
import path from "path";

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

export type CustomServerEntry = string | TcpServerEntry | HttpServerEntry;

export type CustomServerMap = Record<string, CustomServerEntry>;

const DATA_FILE = path.join(process.cwd(), "src/data/custom-tld-servers.json");
const CCTLD_FILE = path.join(
  process.cwd(),
  "src/data/cctld-whois-servers.json",
);

function readCctldServers(): Record<string, string> {
  try {
    const raw = fs.readFileSync(CCTLD_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

const BUILTIN_SERVERS: CustomServerMap = {
  bn: "whois.bnnic.bn",
};

function readCustomServers(): CustomServerMap {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as CustomServerMap;
  } catch {
    return {};
  }
}

function writeCustomServers(servers: CustomServerMap): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(servers, null, 2), "utf-8");
}

export function getAllCustomServers(): CustomServerMap {
  const cctld = readCctldServers();
  const file = readCustomServers();
  return { ...BUILTIN_SERVERS, ...cctld, ...file };
}

export function getUserManagedServers(): CustomServerMap {
  return readCustomServers();
}

export function getCustomServerEntry(tld: string): CustomServerEntry | null {
  const all = getAllCustomServers();
  const normalized = tld.toLowerCase().replace(/^\./, "");
  return all[normalized] ?? null;
}

export function getCustomServer(tld: string): string | null {
  const entry = getCustomServerEntry(tld);
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (entry.type === "tcp") return entry.host;
  return null;
}

export function setCustomServer(tld: string, entry: CustomServerEntry): void {
  const normalized = tld.toLowerCase().replace(/^\./, "");
  const servers = readCustomServers();
  servers[normalized] = entry;
  writeCustomServers(servers);
}

export function deleteCustomServer(tld: string): boolean {
  const normalized = tld.toLowerCase().replace(/^\./, "");
  const servers = readCustomServers();
  if (normalized in servers) {
    delete servers[normalized];
    writeCustomServers(servers);
    return true;
  }
  return false;
}

export function isUserManagedServer(tld: string): boolean {
  const normalized = tld.toLowerCase().replace(/^\./, "");
  const userServers = readCustomServers();
  return normalized in userServers;
}

export function isHttpEntry(entry: CustomServerEntry): entry is HttpServerEntry {
  return typeof entry === "object" && entry.type === "http";
}

export function isTcpEntry(
  entry: CustomServerEntry,
): entry is TcpServerEntry | string {
  if (typeof entry === "string") return true;
  return typeof entry === "object" && entry.type === "tcp";
}

export function getTcpHost(entry: CustomServerEntry): string | null {
  if (typeof entry === "string") return entry;
  if (typeof entry === "object" && entry.type === "tcp") return entry.host;
  return null;
}
