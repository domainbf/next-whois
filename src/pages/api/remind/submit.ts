import type { NextApiRequest, NextApiResponse } from "next";
import { readData, writeData, ReminderRecord, RemindersDB } from "@/lib/data-store";
import { randomBytes } from "crypto";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { domain, email, daysBefore, expirationDate } = req.body;
  if (!domain || !email || !expirationDate) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: "Invalid email" });

  const db = readData<RemindersDB>("reminders.json", []);
  const existing = db.find(
    (r) => r.domain === domain && r.email === email,
  );
  if (existing) {
    existing.daysBefore = Number(daysBefore) || 30;
    existing.expirationDate = String(expirationDate);
    writeData("reminders.json", db);
    return res.status(200).json({ updated: true, id: existing.id });
  }

  const record: ReminderRecord = {
    id: randomBytes(8).toString("hex"),
    domain: String(domain).toLowerCase().trim(),
    email: String(email).trim(),
    daysBefore: Number(daysBefore) || 30,
    expirationDate: String(expirationDate),
    createdAt: new Date().toISOString(),
  };

  db.push(record);
  writeData("reminders.json", db);
  return res.status(200).json({ id: record.id });
}
