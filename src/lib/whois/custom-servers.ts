import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src/data/custom-tld-servers.json");

const BUILTIN_SERVERS: Record<string, string> = {
  bn: "whois.bnnic.bn",
};

function readCustomServers(): Record<string, string> {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function writeCustomServers(servers: Record<string, string>): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(servers, null, 2), "utf-8");
}

export function getAllCustomServers(): Record<string, string> {
  const file = readCustomServers();
  return { ...BUILTIN_SERVERS, ...file };
}

export function getUserManagedServers(): Record<string, string> {
  return readCustomServers();
}

export function getCustomServer(tld: string): string | null {
  const all = getAllCustomServers();
  const normalized = tld.toLowerCase().replace(/^\./, "");
  return all[normalized] || null;
}

export function setCustomServer(tld: string, server: string): void {
  const normalized = tld.toLowerCase().replace(/^\./, "");
  const servers = readCustomServers();
  servers[normalized] = server;
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
