import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readData<T>(filename: string, defaultValue: T): T {
  ensureDir();
  const file = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8")) as T;
    }
  } catch {}
  return defaultValue;
}

export function writeData<T>(filename: string, data: T): void {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf8");
}

export interface StampRecord {
  id: string;
  domain: string;
  tagName: string;
  tagStyle: string;
  link: string;
  description: string;
  nickname: string;
  email: string;
  verifyToken: string;
  verified: boolean;
  createdAt: string;
  verifiedAt?: string;
}

export interface ReminderRecord {
  id: string;
  domain: string;
  email: string;
  daysBefore: number;
  expirationDate: string;
  createdAt: string;
}

export type StampsDB = Record<string, StampRecord[]>;
export type RemindersDB = ReminderRecord[];
