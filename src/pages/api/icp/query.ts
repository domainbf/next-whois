import type { NextApiRequest, NextApiResponse } from "next";

export const config = { maxDuration: 15 };

const VALID_TYPES = ["web", "app", "mapp", "kapp", "bweb", "bapp", "bmapp", "bkapp"] as const;
type IcpType = typeof VALID_TYPES[number];

export type IcpRecord = {
  domain?: string;
  domainId?: string;
  limitAccess?: string | boolean;
  mainLicence?: string;
  natureName?: string;
  serviceLicence?: string;
  unitName?: string;
  updateRecordTime?: string;
  contentTypeName?: string;
  cityId?: string;
  countyId?: string;
  mainUnitAddress?: string;
  serviceName?: string;
  version?: string;
  blackListLevel?: string | number;
};

export type IcpResponse = {
  ok: boolean;
  type: IcpType;
  search: string;
  pageNum: number;
  pageSize: number;
  total: number;
  pages: number;
  lastPage?: number;
  nextPage?: number;
  list: IcpRecord[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IcpResponse>,
) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, type: "web", search: "", pageNum: 1, pageSize: 10, total: 0, pages: 0, list: [], error: "Method not allowed" });
  }

  const type = (req.query.type as string | undefined)?.trim() as IcpType | undefined;
  const search = (req.query.search as string | undefined)?.trim() ?? "";
  const pageNum = Math.max(1, parseInt((req.query.pageNum as string) || "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || "10", 10) || 10));

  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({
      ok: false, type: "web", search, pageNum, pageSize, total: 0, pages: 0, list: [],
      error: `无效的查询类型，支持: ${VALID_TYPES.join(", ")}`,
    });
  }

  if (!search) {
    return res.status(400).json({
      ok: false, type, search, pageNum, pageSize, total: 0, pages: 0, list: [],
      error: "search 参数不能为空",
    });
  }

  try {
    const upstream = `http://api.ong/query/${encodeURIComponent(type)}?search=${encodeURIComponent(search)}&pageNum=${pageNum}&pageSize=${pageSize}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(upstream, {
        signal: controller.signal,
        headers: { "Accept": "application/json", "User-Agent": "NextWhois/2.0" },
      });
    } finally {
      clearTimeout(timer);
    }

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text().catch(() => "");
      return res.status(502).json({
        ok: false, type, search, pageNum, pageSize, total: 0, pages: 0, list: [],
        error: `上游接口错误 ${upstreamRes.status}: ${text.slice(0, 200)}`,
      });
    }

    const data = await upstreamRes.json();

    const list: IcpRecord[] = Array.isArray(data?.data?.list)
      ? data.data.list
      : Array.isArray(data?.list)
      ? data.list
      : [];

    const total: number = data?.data?.total ?? data?.total ?? list.length;
    const pages: number = data?.data?.pages ?? data?.pages ?? Math.ceil(total / pageSize);
    const lastPage: number = data?.data?.lastPage ?? data?.lastPage ?? pages;
    const nextPage: number | undefined = data?.data?.nextPage ?? data?.nextPage ?? undefined;

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true, type, search, pageNum, pageSize,
      total, pages, lastPage, nextPage,
      list,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "未知错误";
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    return res.status(502).json({
      ok: false, type, search, pageNum, pageSize, total: 0, pages: 0, list: [],
      error: isTimeout ? "查询超时，请稍后重试" : `查询失败: ${msg}`,
    });
  }
}
