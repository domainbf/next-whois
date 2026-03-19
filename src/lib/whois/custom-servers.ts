import fs from "fs";
import path from "path";
import {
  getJsonRedisValue,
  setJsonRedisValue,
  isRedisAvailable,
} from "@/lib/server/redis";

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

const REDIS_KEY = "whois:user-servers";

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

function readCustomServersFromFile(): CustomServerMap {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as CustomServerMap;
  } catch {
    return {};
  }
}

function writeCustomServersToFile(servers: CustomServerMap): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(servers, null, 2), "utf-8");
  } catch {
  }
}

async function readUserManagedServers(): Promise<CustomServerMap> {
  if (isRedisAvailable()) {
    const fromRedis = await getJsonRedisValue<CustomServerMap>(REDIS_KEY);
    if (fromRedis) return fromRedis;
  }
  return readCustomServersFromFile();
}

async function writeUserManagedServers(servers: CustomServerMap): Promise<void> {
  if (isRedisAvailable()) {
    await setJsonRedisValue(REDIS_KEY, servers, 0);
  }
  writeCustomServersToFile(servers);
}

export async function getAllCustomServers(): Promise<CustomServerMap> {
  const cctld = readCctldServers();
  const user = await readUserManagedServers();
  return { ...BUILTIN_SERVERS, ...cctld, ...user };
}

export async function getUserManagedServers(): Promise<CustomServerMap> {
  return readUserManagedServers();
}

export async function getCustomServerEntry(
  tld: string,
): Promise<CustomServerEntry | null> {
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

export async function setCustomServer(
  tld: string,
  entry: CustomServerEntry,
): Promise<void> {
  const normalized = tld.toLowerCase().replace(/^\./, "");
  const servers = await readUserManagedServers();
  servers[normalized] = entry;
  await writeUserManagedServers(servers);
}

export async function deleteCustomServer(tld: string): Promise<boolean> {
  const normalized = tld.toLowerCase().replace(/^\./, "");
  const servers = await readUserManagedServers();
  if (normalized in servers) {
    delete servers[normalized];
    await writeUserManagedServers(servers);
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
