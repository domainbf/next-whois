import type { NextApiRequest, NextApiResponse } from "next";
import { many, run } from "@/lib/db-query";
import { requireAdmin } from "@/lib/admin";
import { invalidateApiConfig } from "@/lib/api-config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const session = await requireAdmin(req, res);
    if (!session) return;

    try {
      const rows = await many<{ key: string; value: string }>(
        "SELECT key, value FROM site_settings WHERE key LIKE 'api_%'",
      );
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

      const dbYisiKey = map.api_yisi_key || "";
      const envYisiKey = process.env.YISI_API_KEY || "";
      const effectiveKey = dbYisiKey || envYisiKey;

      return res.json({
        nazhumi_enabled: map.api_nazhumi_enabled !== "0",
        miqingju_enabled: map.api_miqingju_enabled !== "0",
        tianhu_enabled: map.api_tianhu_enabled !== "0",
        yisi_enabled: map.api_yisi_enabled !== "0",
        yisi_key_configured: effectiveKey.length > 0,
        yisi_key_from_env: !dbYisiKey && !!envYisiKey,
        yisi_key_masked:
          effectiveKey.length > 8
            ? effectiveKey.slice(0, 4) + "••••" + effectiveKey.slice(-4)
            : effectiveKey
              ? "••••••••"
              : "",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "PUT") {
    const session = await requireAdmin(req, res);
    if (!session) return;

    const { nazhumi_enabled, miqingju_enabled, tianhu_enabled, yisi_enabled, yisi_key } =
      req.body as {
        nazhumi_enabled?: boolean;
        miqingju_enabled?: boolean;
        tianhu_enabled?: boolean;
        yisi_enabled?: boolean;
        yisi_key?: string;
      };

    try {
      const updates: [string, string][] = [
        ["api_nazhumi_enabled", nazhumi_enabled !== false ? "1" : "0"],
        ["api_miqingju_enabled", miqingju_enabled !== false ? "1" : "0"],
        ["api_tianhu_enabled", tianhu_enabled !== false ? "1" : "0"],
        ["api_yisi_enabled", yisi_enabled !== false ? "1" : "0"],
      ];

      if (yisi_key !== undefined && !yisi_key.includes("••••")) {
        updates.push(["api_yisi_key", yisi_key.trim()]);
      }

      for (const [key, value] of updates) {
        await run(
          `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, value],
        );
      }

      invalidateApiConfig();
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    const session = await requireAdmin(req, res);
    if (!session) return;

    const { service } = req.query;

    try {
      if (service === "nazhumi") {
        const r = await fetch(
          "https://www.nazhumi.com/api/v1?domain=com&order=new",
          { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } },
        );
        if (!r.ok) return res.json({ ok: false, error: `HTTP ${r.status}` });
        const j = await r.json();
        const count = j.data?.price?.length ?? 0;
        return res.json({
          ok: count > 0,
          details: count > 0 ? `已获取 ${count} 条注册商数据` : "返回数据为空",
        });
      }

      if (service === "miqingju") {
        const r = await fetch(
          "https://api.miqingju.com/api/v1/query?tld=com",
          { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } },
        );
        if (!r.ok) return res.json({ ok: false, error: `HTTP ${r.status}` });
        const j = await r.json();
        const count = j.data?.length ?? 0;
        return res.json({
          ok: !!j.success,
          details: j.success ? `已获取 ${count} 条注册商数据` : (j.message ?? "请求失败"),
        });
      }

      if (service === "tianhu") {
        const r = await fetch(
          "https://api.tian.hu/whois/google.com",
          { signal: AbortSignal.timeout(10000), headers: { Accept: "application/json" } },
        );
        if (!r.ok) return res.json({ ok: false, error: `HTTP ${r.status}` });
        const j = await r.json();
        if (j.code !== 200) return res.json({ ok: false, error: j.message || "请求失败" });
        const d = j.data?.formatted?.domain;
        const reg = j.data?.formatted?.registrar;
        return res.json({
          ok: true,
          details: `${j.data?.domain ?? "google.com"} · 注册商: ${reg?.registrar_name ?? "已返回数据"} · NS: ${(d?.name_servers ?? []).length} 条`,
        });
      }

      if (service === "yisi") {
        const rows = await many<{ value: string }>(
          "SELECT value FROM site_settings WHERE key = 'api_yisi_key'",
        );
        const dbKey = rows[0]?.value || "";
        const apiKey = dbKey || process.env.YISI_API_KEY || "";

        if (!apiKey) return res.json({ ok: false, error: "未配置 API Key" });

        const r = await fetch("https://yisi.yun/api/lookup?query=google.com", {
          signal: AbortSignal.timeout(10000),
          headers: { Accept: "application/json", "x-api-key": apiKey },
        });
        const j = await r.json();
        if (!j.status) return res.json({ ok: false, error: j.error || "请求失败" });
        return res.json({
          ok: true,
          details: `${j.result?.domain} · ${j.result?.registrar ?? "已返回数据"}`,
        });
      }

      return res.status(400).json({ error: "unknown service" });
    } catch (err: any) {
      return res.json({ ok: false, error: err.message });
    }
  }

  res.setHeader("Allow", "GET, PUT, POST");
  res.status(405).json({ error: "Method not allowed" });
}
