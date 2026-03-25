import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await requireAdmin(req, res);
  if (!session) return;

  const cwd = process.cwd();
  const lockFile = path.join(cwd, ".git", "index.lock");
  const log: string[] = [];

  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      log.push("✓ 已删除 index.lock 锁文件");
    } else {
      log.push("- 无锁文件");
    }

    try {
      execSync("git merge --abort", { cwd, stdio: "pipe" });
      log.push("✓ 已中止待定合并");
    } catch {
      log.push("- 无待定合并需要中止");
    }

    const out = execSync("git push origin main --force", {
      cwd,
      timeout: 30000,
      stdio: "pipe",
    }).toString().trim();
    log.push("✓ Force push 成功: " + (out || "done"));

    return res.json({ success: true, log });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.push("✗ 错误: " + msg);
    return res.status(500).json({ success: false, log });
  }
}
