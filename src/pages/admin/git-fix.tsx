import { useState } from "react";
import Head from "next/head";

export default function GitFix() {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function run() {
    setLoading(true);
    setLog([]);
    try {
      const res = await fetch("/api/admin/git-force-push", { method: "POST" });
      const data = await res.json();
      setLog(data.log ?? []);
      setDone(data.success);
    } catch (e) {
      setLog(["请求失败，请确认已登录管理员账号"]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Git Fix</title></Head>
      <div style={{ maxWidth: 480, margin: "60px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>🔧 Git Force Push 修复工具</h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>
          点击下方按钮，自动删除锁文件、中止待定合并、并强制推送到远程。
        </p>
        <button
          onClick={run}
          disabled={loading}
          style={{
            background: loading ? "#aaa" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "14px 32px",
            fontSize: 16,
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          {loading ? "执行中…" : "🚀 执行 Force Push"}
        </button>

        {log.length > 0 && (
          <div style={{
            marginTop: 24,
            background: done ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${done ? "#86efac" : "#fca5a5"}`,
            borderRadius: 10,
            padding: 16,
          }}>
            <p style={{ fontWeight: "bold", marginBottom: 8, color: done ? "#166534" : "#991b1b" }}>
              {done ? "✅ 操作成功！" : "❌ 操作失败"}
            </p>
            {log.map((line, i) => (
              <p key={i} style={{ fontSize: 13, color: "#374151", margin: "4px 0", fontFamily: "monospace" }}>
                {line}
              </p>
            ))}
            {done && (
              <p style={{ marginTop: 12, fontSize: 13, color: "#166534" }}>
                GitHub 已更新！可以关闭此页面了。
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
