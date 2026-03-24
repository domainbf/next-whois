import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/admin";
import { many, run, isDbReady } from "@/lib/db-query";

type SeedEntry = {
  entry_date: string;
  type: "new" | "feature" | "improve" | "fix";
  zh: string;
  version: string;
};

const SEED: SeedEntry[] = [
  // v3.10
  { entry_date: "2026-03-24", type: "new",     version: "3.10", zh: "OG 图片文字可编辑：品牌名称、标语在后台实时修改，即时生效" },
  { entry_date: "2026-03-24", type: "improve", version: "3.10", zh: "OG 图片所有 8 种样式的品牌名 / 标语统一读取配置，不再硬编码" },
  { entry_date: "2026-03-24", type: "new",     version: "3.10", zh: "更新记录后台新增「同步版本历史」按钮，自动导入缺失条目" },
  { entry_date: "2026-03-24", type: "improve", version: "3.10", zh: "用户搜索历史隐藏高价值 / 有价值域名标签（数据仍后台记录）" },
  // v3.9
  { entry_date: "2026-03-24", type: "new",     version: "3.9", zh: "API Key 管理系统：支持生成、吊销、范围管理（api / subscription / all）" },
  { entry_date: "2026-03-24", type: "new",     version: "3.9", zh: "管理后台新增「密钥」页面，提供 Key 生成 / 启停 / 删除 / 使用统计" },
  { entry_date: "2026-03-24", type: "feature", version: "3.9", zh: "所有公开 API（WHOIS / DNS / SSL / IP）支持 X-API-Key 鉴权，全局可开关" },
  { entry_date: "2026-03-24", type: "improve", version: "3.9", zh: "文档页新增「API Key 鉴权」章节，说明传参方式、权限范围及错误码" },
  // v3.8
  { entry_date: "2026-03-23", type: "fix",     version: "3.8", zh: "修复页面切换动画失效问题（animationKey 逻辑错误）" },
  { entry_date: "2026-03-23", type: "fix",     version: "3.8", zh: "修复 DNS / SSL / IP 工具页 URL 参数在首次渲染时被忽略的问题" },
  { entry_date: "2026-03-23", type: "new",     version: "3.8", zh: "DNS / IP / SSL API 新增限流保护（60 / 30 / 20 次/分钟）" },
  { entry_date: "2026-03-23", type: "fix",     version: "3.8", zh: "修复站点名称水合不一致导致首屏闪烁的问题" },
  // v3.7
  { entry_date: "2026-03-23", type: "improve", version: "3.7", zh: "Redis 缓存升级为智能 TTL 策略：按域名类型自适应缓存时长" },
  { entry_date: "2026-03-23", type: "improve", version: "3.7", zh: "新增 L1（内存 30s）+ L2（Redis 自适应）双层缓存架构" },
  // v3.6
  { entry_date: "2026-03-22", type: "new",     version: "3.6", zh: "新增 WHOIS 限流（60 次/分钟）并引入 429 响应" },
  { entry_date: "2026-03-22", type: "improve", version: "3.6", zh: "文档页「限流规则」表格更新为实际阈值" },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (!(await isDbReady())) return res.status(503).json({ error: "数据库暂不可用" });

  try {
    const existing = await many<{ version: string; zh: string }>(
      `SELECT version, zh FROM changelog_entries WHERE version IS NOT NULL`,
    );
    const existingSet = new Set(existing.map(e => `${e.version}::${e.zh.slice(0, 40)}`));

    let inserted = 0;
    for (const e of SEED) {
      const key = `${e.version}::${e.zh.slice(0, 40)}`;
      if (existingSet.has(key)) continue;
      const id = randomBytes(8).toString("hex");
      await run(
        `INSERT INTO changelog_entries (id, entry_date, type, zh, en, version) VALUES ($1, $2, $3, $4, '', $5)`,
        [id, e.entry_date, e.type, e.zh, e.version],
      );
      inserted++;
    }

    return res.json({ ok: true, inserted, skipped: SEED.length - inserted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
