import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

function run(cmd: string, args: string[], cwd: string): { out: string; err: string; ok: boolean } {
  const r = spawnSync(cmd, args, {
    cwd,
    timeout: 45000,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return {
    out: (r.stdout ?? "").trim(),
    err: (r.stderr ?? "").trim(),
    ok: r.status === 0,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await requireAdmin(req, res);
  if (!session) return;

  const cwd = process.cwd();
  const log: string[] = [];

  // 1. Remove index.lock
  const lockFile = path.join(cwd, ".git", "index.lock");
  if (fs.existsSync(lockFile)) {
    try { fs.unlinkSync(lockFile); log.push("✓ 已删除 index.lock"); }
    catch (e) { log.push("✗ 删除锁文件失败: " + e); }
  } else {
    log.push("- 无锁文件");
  }

  // 2. Abort merge
  const abort = run("git", ["merge", "--abort"], cwd);
  log.push(abort.ok ? "✓ 已中止合并" : "- 无待定合并");

  // 3. Check remote URL
  const remoteUrl = run("git", ["config", "--get", "remote.origin.url"], cwd);
  log.push("远程: " + (remoteUrl.out || "未知"));

  // 4. Force push
  const push = run("git", ["push", "origin", "main", "--force"], cwd);
  if (push.ok) {
    log.push("✓ Force push 成功！" + (push.out ? " " + push.out : ""));
  } else {
    log.push("✗ Push 失败: " + (push.err || push.out || "未知错误"));
    // Try with verbose for debugging
    const verbose = run("git", ["push", "origin", "main", "--force", "--verbose"], cwd);
    log.push("详细: " + (verbose.err || verbose.out));
  }

  const success = push.ok;
  return res.json({ success, log });
}
