import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";
import { many } from "@/lib/db-query";
import { LIFECYCLE_TABLE } from "@/lib/lifecycle";

export type CompareRow = {
  tld: string;
  // Static lifecycle.ts values
  s_grace: number;
  s_redemption: number;
  s_pending: number;
  s_preExpiry: number;
  s_dropHour: number | null;
  s_dropTimezone: string | null;
  s_confidence: string;
  s_registry: string | null;
  // AI-scraped tld_rules values (null = not scraped)
  db_grace: number | null;
  db_redemption: number | null;
  db_pending: number | null;
  db_preExpiry: number | null;
  db_dropHour: number | null;
  db_dropTimezone: string | null;
  db_confidence: string | null;
  db_updated: string | null;
  // Diff summary
  diffs: string[];
  hasConflict: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await requireAdmin(req, res);
  if (!session) return;

  // Load DB rules
  const dbRows = await many<{
    tld: string;
    grace_period_days: number;
    redemption_period_days: number;
    pending_delete_days: number;
    drop_hour: number | null;
    drop_minute: number | null;
    drop_second: number | null;
    drop_timezone: string | null;
    pre_expiry_days: number | null;
    confidence: string;
    updated_at: string;
  }>(
    `SELECT tld, grace_period_days, redemption_period_days, pending_delete_days,
            drop_hour, drop_minute, drop_second, drop_timezone, pre_expiry_days,
            confidence, updated_at
     FROM tld_rules ORDER BY tld`
  ).catch(() => []);

  const dbMap = new Map(dbRows.map(r => [r.tld, r]));

  // Build comparison for every TLD in the static table
  const rows: CompareRow[] = [];

  for (const [tld, lc] of Object.entries(LIFECYCLE_TABLE)) {
    const db = dbMap.get(tld);
    const diffs: string[] = [];

    if (db) {
      if (db.grace_period_days !== lc.grace)
        diffs.push(`宽限期: 静态=${lc.grace}d AI=${db.grace_period_days}d`);
      if (db.redemption_period_days !== lc.redemption)
        diffs.push(`赎回期: 静态=${lc.redemption}d AI=${db.redemption_period_days}d`);
      if (db.pending_delete_days !== lc.pendingDelete)
        diffs.push(`待删期: 静态=${lc.pendingDelete}d AI=${db.pending_delete_days}d`);
      const sPreExpiry = lc.preExpiryDays ?? 0;
      const dbPreExpiry = db.pre_expiry_days ?? 0;
      if (sPreExpiry !== dbPreExpiry)
        diffs.push(`提前删: 静态=${sPreExpiry}d AI=${dbPreExpiry}d`);
    }

    rows.push({
      tld,
      s_grace: lc.grace,
      s_redemption: lc.redemption,
      s_pending: lc.pendingDelete,
      s_preExpiry: lc.preExpiryDays ?? 0,
      s_dropHour: lc.dropHour ?? null,
      s_dropTimezone: lc.dropTimezone ?? null,
      s_confidence: lc.confidence ?? "est",
      s_registry: lc.registry ?? null,
      db_grace: db?.grace_period_days ?? null,
      db_redemption: db?.redemption_period_days ?? null,
      db_pending: db?.pending_delete_days ?? null,
      db_preExpiry: db?.pre_expiry_days ?? null,
      db_dropHour: db?.drop_hour ?? null,
      db_dropTimezone: db?.drop_timezone ?? null,
      db_confidence: db?.confidence ?? null,
      db_updated: db?.updated_at ?? null,
      diffs,
      hasConflict: diffs.length > 0,
    });
  }

  // Sort: conflicts first, then by tld
  rows.sort((a, b) => {
    if (a.hasConflict !== b.hasConflict) return a.hasConflict ? -1 : 1;
    return a.tld.localeCompare(b.tld);
  });

  return res.json({
    total: rows.length,
    scraped: rows.filter(r => r.db_grace !== null).length,
    conflicts: rows.filter(r => r.hasConflict).length,
    rows,
  });
}
