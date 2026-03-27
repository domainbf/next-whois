import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/admin";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

function run(cmd: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): { out: string; err: string; ok: boolean } {
  const r = spawnSync(cmd, args, {
    cwd,
    timeout: 45000,
    encoding: "utf8",
    env: env ?? { ...process.env, GIT_TERMINAL_PROMPT: "0" },
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

  const { token } = req.body as { token?: string };
  if (!token || token.trim().length < 10) {
    return res.status(400).json({ success: false, log: ["✗ 请提供 GitHub Personal Access Token"] });
  }

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

  // 3. Get repo info
  const remoteUrl = run("git", ["config", "--get", "remote.origin.url"], cwd);
  const rawUrl = remoteUrl.out || "";
  // Build authenticated URL: https://TOKEN@github.com/owner/repo
  const authUrl = rawUrl.replace("https://github.com/", `https://${token.trim()}@github.com/`);
  log.push("✓ 已注入认证 Token");

  // 4. Force push using authenticated URL directly
  const push = run("git", ["push", authUrl, "HEAD:main", "--force"], cwd, {
    ...process.env,
    GIT_TERMINAL_PROMPT: "0",
  });

  if (push.ok) {
    log.push("✅ Force push 成功！");
  } else {
    const errMsg = (push.err || push.out || "未知错误")
      .replace(token.trim(), "***")  // hide token in logs
      .replace(authUrl, rawUrl);
    log.push("✗ Push 失败: " + errMsg);
  }

  return res.json({ success: push.ok, log });
}
