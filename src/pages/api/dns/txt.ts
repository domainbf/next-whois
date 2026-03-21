import type { NextApiRequest, NextApiResponse } from "next";
import dns from "dns";
import { promisify } from "util";

export const config = { maxDuration: 10 };

type ResolverResult = {
  name: string;
  records: string[][];
  latencyMs: number;
  error?: string;
};

type Data = {
  name: string;
  found: boolean;
  records: string[][];
  resolvers: ResolverResult[];
  latencyMs: number;
  error?: string;
};

const RESOLVERS = [
  { name: "Google DNS", ip: "8.8.8.8" },
  { name: "Cloudflare", ip: "1.1.1.1" },
];

async function queryTxt(ip: string, name: string, timeoutMs = 5000): Promise<{ records: string[][]; latencyMs: number }> {
  const resolver = new dns.Resolver();
  resolver.setServers([ip]);
  const resolveTxt = promisify(resolver.resolveTxt.bind(resolver));

  const t0 = Date.now();
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), timeoutMs)
  );
  const records = await Promise.race([resolveTxt(name), timer]);
  return { records: records as string[][], latencyMs: Date.now() - t0 };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const name = (req.query.name as string | undefined)?.trim();
  if (!name) {
    return res.status(400).json({
      name: "",
      found: false,
      records: [],
      resolvers: [],
      latencyMs: 0,
      error: "name parameter is required",
    });
  }

  const t0 = Date.now();

  const results = await Promise.allSettled(
    RESOLVERS.map(async (r): Promise<ResolverResult> => {
      const rt0 = Date.now();
      try {
        const { records, latencyMs } = await queryTxt(r.ip, name);
        return { name: r.name, records, latencyMs };
      } catch (e: any) {
        return { name: r.name, records: [], latencyMs: Date.now() - rt0, error: e?.message || "unknown" };
      }
    })
  );

  const resolvers: ResolverResult[] = results.map((r) =>
    r.status === "fulfilled" ? r.value : { name: "unknown", records: [], latencyMs: 0, error: "rejected" }
  );

  const allRecords: string[][] = resolvers.flatMap((r) => r.records);
  const found = allRecords.length > 0;

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    name,
    found,
    records: allRecords,
    resolvers,
    latencyMs: Date.now() - t0,
  });
}
