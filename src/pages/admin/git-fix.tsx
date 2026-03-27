import { useState } from "react";
import Head from "next/head";

export default function GitFix() {
  const [token, setToken] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function run() {
    if (!token.trim()) return;
    setLoading(true);
    setLog([]);
    try {
      const res = await fetch("/api/admin/git-force-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setLog(data.log ?? []);
      setDone(data.success);
    } catch {
      setLog(["请求失败，请确认已登录管理员账号"]);
    } finally {
      setLoading(false);
    }
  }

  const s = {
    wrap: { maxWidth: 480, margin: "40px auto", padding: "0 20px", fontFamily: "sans-serif" } as React.CSSProperties,
    h2: { fontSize: 20, marginBottom: 8 } as React.CSSProperties,
    p: { color: "#666", fontSize: 14, marginBottom: 16 } as React.CSSProperties,
    label: { display: "block", fontSize: 13, fontWeight: "bold", marginBottom: 6, color: "#374151" } as React.CSSProperties,
    input: { width: "100%", boxSizing: "border-box" as const, border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 12px", fontSize: 14, marginBottom: 12, fontFamily: "monospace" },
    hint: { fontSize: 12, color: "#6b7280", marginBottom: 20, lineHeight: 1.6 } as React.CSSProperties,
    btn: (disabled: boolean) => ({
      background: disabled ? "#aaa" : "#2563eb",
      color: "#fff",
      border: "none",
      borderRadius: 10,
      padding: "14px 32px",
      fontSize: 16,
      fontWeight: "bold" as const,
      cursor: disabled ? "not-allowed" : "pointer",
      width: "100%",
    }),
    result: (ok: boolean) => ({
      marginTop: 24,
      background: ok ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${ok ? "#86efac" : "#fca5a5"}`,
      borderRadius: 10,
      padding: 16,
    }),
  };

  return (
    <>
      <Head><title>Git Fix</title></Head>
      <div style={s.wrap}>
        <h2 style={s.h2}>🔧 Git Force Push 修复工具</h2>
        <p style={s.p}>使用 GitHub 个人访问令牌强制推送到远程，解决分支冲突问题。</p>

        <label style={s.label}>GitHub Personal Access Token</label>
        <input
          type="password"
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={s.input}
        />
        <p style={s.hint}>
          获取方式：GitHub → Settings → Developer settings →<br />
          Personal access tokens → Tokens (classic) → Generate new token<br />
          勾选 <strong>repo</strong> 权限即可。
        </p>

        <button
          onClick={run}
          disabled={loading || !token.trim()}
          style={s.btn(loading || !token.trim())}
        >
          {loading ? "执行中…" : "🚀 执行 Force Push"}
        </button>

        {log.length > 0 && (
          <div style={s.result(done)}>
            <p style={{ fontWeight: "bold", marginBottom: 8, color: done ? "#166534" : "#991b1b" }}>
              {done ? "✅ 操作成功！GitHub 已更新。" : "❌ 操作失败"}
            </p>
            {log.map((line, i) => (
              <p key={i} style={{ fontSize: 13, color: "#374151", margin: "4px 0", fontFamily: "monospace" }}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
