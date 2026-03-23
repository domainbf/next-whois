import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getEppStatusDisplayName } from "@/lib/whois/epp_status";

export const config = { runtime: "edge" };

function detectType(q: string): string {
  if (!q) return "unknown";
  if (/^AS\d+$/i.test(q)) return "ASN";
  if (/\/\d{1,3}$/.test(q)) return "CIDR";
  if (q.includes(":")) return "IPv6";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(q)) return "IPv4";
  return "DOMAIN";
}

function getRelativeTime(dateStr: string): string {
  if (!dateStr || dateStr === "Unknown") return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0) {
      const abs = Math.abs(diffDays);
      if (abs < 30) return `in ${abs}d`;
      if (abs < 365) return `in ${Math.floor(abs / 30)}mo`;
      return `in ${Math.floor(abs / 365)}y`;
    }
    if (diffDays < 1) return "today";
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  } catch {
    return "";
  }
}

function isValid(v: string | undefined | null): v is string {
  return !!v && v !== "Unknown" && v !== "N/A" && v !== "";
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "Unknown") return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  } catch {
    return dateStr;
  }
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || searchParams.get("q") || "";
  const w = Math.min(
    Math.max(parseInt(searchParams.get("w") || "1200") || 1200, 200),
    4096,
  );
  const h = Math.min(
    Math.max(parseInt(searchParams.get("h") || "630") || 630, 200),
    4096,
  );
  const theme = searchParams.get("theme") === "dark" ? "dark" : "light";
  const styleParam = searchParams.get("style");

  const isDark = theme === "dark";
  const bg = isDark ? "#09090b" : "#fafafa";
  const fg = isDark ? "#fafafa" : "#18181b";
  const muted = isDark ? "#a1a1aa" : "#71717a";
  const border = isDark ? "#27272a" : "#e4e4e7";
  const accent = isDark ? "#3b82f6" : "#2563eb";
  const cardBg = isDark ? "#18181b" : "#ffffff";
  const subtleBg = isDark ? "#27272a" : "#f4f4f5";
  const greenColor = isDark ? "#4ade80" : "#16a34a";
  const redColor = "#ef4444";
  const amberColor = isDark ? "#fbbf24" : "#d97706";

  const queryType = query ? detectType(query) : "unknown";

  const typeBadgeColors: Record<string, { bg: string; fg: string }> = {
    DOMAIN: {
      bg: isDark ? "#1e3a5f" : "#dbeafe",
      fg: isDark ? "#60a5fa" : "#2563eb",
    },
    IPv4: {
      bg: isDark ? "#064e3b" : "#d1fae5",
      fg: isDark ? "#34d399" : "#059669",
    },
    IPv6: {
      bg: isDark ? "#2e1065" : "#ede9fe",
      fg: isDark ? "#a78bfa" : "#7c3aed",
    },
    ASN: {
      bg: isDark ? "#431407" : "#ffedd5",
      fg: isDark ? "#fb923c" : "#ea580c",
    },
    CIDR: {
      bg: isDark ? "#500724" : "#fce7f3",
      fg: isDark ? "#f472b6" : "#db2777",
    },
    unknown: { bg: subtleBg, fg: muted },
  };
  const typeBadge = typeBadgeColors[queryType] || typeBadgeColors.unknown;

  let registrar = "";
  let created = "";
  let expires = "";
  let updated = "";
  let statusList: string[] = [];
  let nsList: string[] = [];
  let age = "";
  let remainingDays: number | null = null;
  let dnssec = "";
  let whoisServer = "";
  let registrantOrg = "";
  let country = "";
  let hasDetails = false;

  if (query) {
    try {
      const origin = new URL(req.url).origin;
      const res = await fetch(
        `${origin}/api/lookup?query=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      if (data.status && data.result) {
        const r = data.result;
        if (isValid(r.registrar)) registrar = r.registrar;
        if (isValid(r.creationDate)) created = formatDate(r.creationDate);
        if (isValid(r.expirationDate)) expires = formatDate(r.expirationDate);
        if (isValid(r.updatedDate)) updated = formatDate(r.updatedDate);
        if (Array.isArray(r.status) && r.status.length > 0) {
          statusList = r.status
            .slice(0, 6)
            .map((s: { status: string }) => getEppStatusDisplayName(s.status));
        }
        if (Array.isArray(r.nameServers) && r.nameServers.length > 0) {
          nsList = r.nameServers.slice(0, 4);
        }
        if (r.domainAge != null) age = String(r.domainAge);
        if (r.remainingDays != null) remainingDays = r.remainingDays;
        if (isValid(r.dnssec)) dnssec = r.dnssec;
        if (isValid(r.whoisServer)) whoisServer = r.whoisServer;
        if (isValid(r.registrantOrganization))
          registrantOrg = r.registrantOrganization;
        if (isValid(r.registrantCountry)) country = r.registrantCountry;
        hasDetails = !!(registrar || created || expires);
      }
    } catch {}
  }

  const statusColor =
    remainingDays === null
      ? muted
      : remainingDays <= 0
        ? redColor
        : remainingDays <= 60
          ? amberColor
          : greenColor;
  const statusLabel =
    remainingDays === null
      ? "N/A"
      : remainingDays <= 0
        ? "EXPIRED"
        : remainingDays <= 60
          ? "EXPIRING SOON"
          : "ACTIVE";

  const createdRelative = created ? getRelativeTime(created) : "";
  const expiresRelative =
    remainingDays !== null
      ? remainingDays > 0
        ? `${remainingDays}d remaining`
        : "Expired"
      : expires
        ? getRelativeTime(expires)
        : "";
  const updatedRelative = updated ? getRelativeTime(updated) : "";

  const domainFontSize = Math.min(
    84,
    Math.max(36, Math.floor(900 / Math.max(query.length, 1))),
  );

  const styleVariant =
    styleParam !== null
      ? Math.min(3, Math.max(0, parseInt(styleParam) || 0))
      : query
        ? hashCode(query) % 4
        : 0;

  const dotGrid = `radial-gradient(${isDark ? "#27272a" : "#d4d4d8"} 1px, transparent 1px)`;

  const hostHeader = req.headers.get("host") || new URL(req.url).host;
  const siteHost = hostHeader.replace(/:\d+$/, "") || "RDAP+WHOIS";

  const logoW = (size: number, bg2: string, fg2: string, radius = 6) => (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: bg2,
        color: fg2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: `${radius}px`,
        fontSize: `${Math.round(size * 0.55)}px`,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      W
    </div>
  );

  const typePill = (
    <div
      style={{
        padding: "5px 16px",
        borderRadius: "9999px",
        backgroundColor: typeBadge.bg,
        fontSize: "15px",
        color: typeBadge.fg,
        fontWeight: 700,
        letterSpacing: "0.06em",
        display: "flex",
        alignItems: "center",
      }}
    >
      {`${queryType} LOOKUP`}
    </div>
  );

  let content: JSX.Element;

  if (query && hasDetails) {
    content = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
          backgroundImage: dotGrid,
          backgroundSize: "24px 24px",
          padding: "40px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            maxWidth: "1040px",
            backgroundColor: cardBg,
            border: `1px solid ${border}`,
            borderRadius: "20px",
            padding: "40px 48px 32px",
            gap: "20px",
            boxShadow: isDark
              ? "0 8px 40px rgba(0,0,0,0.4)"
              : "0 8px 40px rgba(0,0,0,0.07)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    padding: "3px 10px",
                    borderRadius: "4px",
                    backgroundColor: typeBadge.bg,
                    fontSize: "11px",
                    fontWeight: 700,
                    color: typeBadge.fg,
                    letterSpacing: "0.08em",
                    display: "flex",
                  }}
                >
                  {queryType}
                </div>
                {age && (
                  <div
                    style={{
                      padding: "3px 10px",
                      borderRadius: "4px",
                      backgroundColor: subtleBg,
                      fontSize: "11px",
                      fontWeight: 500,
                      color: muted,
                      display: "flex",
                    }}
                  >
                    {`${age} ${parseInt(age) === 1 ? "year" : "years"}`}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: Math.min(
                    54,
                    Math.max(
                      28,
                      Math.floor((780 / Math.max(query.length, 1)) * 1.5),
                    ),
                  ),
                  fontWeight: 700,
                  color: fg,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                }}
              >
                {query}
              </span>
              {registrar && (
                <span
                  style={{
                    fontSize: "14px",
                    color: muted,
                    fontWeight: 400,
                    marginTop: "2px",
                    display: "flex",
                  }}
                >
                  {registrar}
                  {registrantOrg && registrantOrg !== registrar
                    ? ` · ${registrantOrg}`
                    : ""}
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "6px",
                marginLeft: "20px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "10px",
                  backgroundColor: `${statusColor}18`,
                  border: `1px solid ${statusColor}40`,
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: statusColor,
                  }}
                />
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: statusColor,
                    letterSpacing: "0.04em",
                    display: "flex",
                  }}
                >
                  {statusLabel}
                </span>
              </div>
              {remainingDays !== null && remainingDays > 0 && (
                <span
                  style={{
                    fontSize: "11px",
                    color: muted,
                    fontWeight: 500,
                    display: "flex",
                  }}
                >
                  {`${remainingDays}d remaining`}
                </span>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              borderTop: `1px solid ${border}`,
              paddingTop: "18px",
              gap: "40px",
              flexWrap: "wrap",
            }}
          >
            {created && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: muted,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    display: "flex",
                  }}
                >
                  CREATED
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    color: fg,
                    fontWeight: 600,
                    fontFamily: "monospace",
                    display: "flex",
                  }}
                >
                  {created}
                </span>
                {createdRelative && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: muted,
                      fontWeight: 400,
                      display: "flex",
                    }}
                  >
                    {createdRelative}
                  </span>
                )}
              </div>
            )}
            {expires && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: muted,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    display: "flex",
                  }}
                >
                  EXPIRES
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    color: fg,
                    fontWeight: 600,
                    fontFamily: "monospace",
                    display: "flex",
                  }}
                >
                  {expires}
                </span>
                {expiresRelative && (
                  <span
                    style={{
                      fontSize: "11px",
                      color:
                        remainingDays !== null && remainingDays <= 60
                          ? amberColor
                          : greenColor,
                      fontWeight: 500,
                      display: "flex",
                    }}
                  >
                    {expiresRelative}
                  </span>
                )}
              </div>
            )}
            {updated && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: muted,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    display: "flex",
                  }}
                >
                  UPDATED
                </span>
                <span
                  style={{
                    fontSize: "16px",
                    color: fg,
                    fontWeight: 600,
                    fontFamily: "monospace",
                    display: "flex",
                  }}
                >
                  {updated}
                </span>
                {updatedRelative && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: muted,
                      fontWeight: 400,
                      display: "flex",
                    }}
                  >
                    {updatedRelative}
                  </span>
                )}
              </div>
            )}
            {(registrantOrg || country) && (
              <div
                style={{
                  display: "flex",
                  gap: "32px",
                  flexWrap: "wrap",
                  marginLeft: "auto",
                }}
              >
                {country && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        color: muted,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        display: "flex",
                      }}
                    >
                      COUNTRY
                    </span>
                    <span
                      style={{
                        fontSize: "16px",
                        color: fg,
                        fontWeight: 600,
                        display: "flex",
                      }}
                    >
                      {country}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {(statusList.length > 0 || nsList.length > 0 || whoisServer) && (
            <div
              style={{
                display: "flex",
                gap: "32px",
                flexWrap: "wrap",
                borderTop: `1px solid ${border}`,
                paddingTop: "14px",
              }}
            >
              {statusList.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: muted,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      display: "flex",
                    }}
                  >
                    STATUS
                  </span>
                  <div
                    style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}
                  >
                    {statusList.map((s) => (
                      <div
                        key={s}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: subtleBg,
                          fontSize: "10px",
                          color: muted,
                          fontWeight: 500,
                          fontFamily: "monospace",
                          display: "flex",
                        }}
                      >
                        {s.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nsList.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: muted,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      display: "flex",
                    }}
                  >
                    NAMESERVERS
                  </span>
                  <div
                    style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}
                  >
                    {nsList.map((n) => (
                      <div
                        key={n}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: subtleBg,
                          fontSize: "10px",
                          color: muted,
                          fontWeight: 500,
                          fontFamily: "monospace",
                          display: "flex",
                        }}
                      >
                        {n.trim().toLowerCase()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {whoisServer && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: muted,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      display: "flex",
                    }}
                  >
                    WHOIS SERVER
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: muted,
                      fontWeight: 500,
                      fontFamily: "monospace",
                      display: "flex",
                    }}
                  >
                    {whoisServer}
                  </span>
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${border}`,
              paddingTop: "16px",
              marginTop: "4px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              {logoW(24, fg, bg, 4)}
              <span
                style={{
                  fontSize: "13px",
                  color: muted,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  display: "flex",
                }}
              >
                RDAP+WHOIS
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              {dnssec && (
                <span
                  style={{
                    fontSize: "11px",
                    color: muted,
                    fontFamily: "monospace",
                    display: "flex",
                  }}
                >
                  DNSSEC: {dnssec}
                </span>
              )}
              <span
                style={{ fontSize: "12px", color: accent, fontWeight: 500, display: "flex" }}
              >
                {siteHost}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (styleVariant === 1) {
    const panelBg = isDark
      ? "linear-gradient(145deg,#1d2a6e 0%,#4c1d95 100%)"
      : "linear-gradient(145deg,#1d4ed8 0%,#7c3aed 100%)";

    content = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: bg,
        }}
      >
        <div
          style={{
            width: "300px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 40px",
            backgroundImage: panelBg,
            flexShrink: 0,
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {logoW(44, "rgba(255,255,255,0.9)", "rgba(0,0,0,0.7)", 10)}
            <span
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "0.06em",
                display: "flex",
              }}
            >
              RDAP+WHOIS
            </span>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            <div
              style={{
                padding: "7px 16px",
                borderRadius: "8px",
                backgroundColor: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.95)",
                  letterSpacing: "0.08em",
                  display: "flex",
                }}
              >
                {queryType}
              </span>
            </div>
            <span
              style={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.55)",
                display: "flex",
              }}
            >
              Domain Intelligence
            </span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 56px",
          }}
        >
          <div />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <span
              style={{
                fontSize: domainFontSize,
                fontWeight: 700,
                color: fg,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                display: "flex",
                wordBreak: "break-all",
              }}
            >
              {query || "WHOIS Lookup"}
            </span>
            <span
              style={{
                fontSize: "17px",
                color: muted,
                fontWeight: 400,
                display: "flex",
              }}
            >
              WHOIS / RDAP · Domain Lookup Tool
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${border}`,
              paddingTop: "24px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                color: muted,
                fontWeight: 500,
                display: "flex",
              }}
            >
              {siteHost}
            </span>
            <span
              style={{
                fontSize: "13px",
                color: accent,
                fontWeight: 500,
                display: "flex",
              }}
            >
              NIC.RW 提供支持
            </span>
          </div>
        </div>
      </div>
    );
  } else if (styleVariant === 2) {
    const termBg = "#0a0a0a";
    const termGreen = "#4ade80";
    const termMuted = "#52525b";
    const termFg = "#f4f4f5";
    const termBorder = "#1f1f1f";

    content = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: termBg,
          padding: "52px 64px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {logoW(32, termFg, termBg, 6)}
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: termMuted,
              letterSpacing: "0.1em",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            RDAP+WHOIS
          </span>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "18px",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            <span
              style={{
                fontSize: "15px",
                color: termGreen,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              $
            </span>
            <span
              style={{
                fontSize: "15px",
                color: termMuted,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              {`whois ${query || "example.com"}`}
            </span>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "6px" }}
          >
            <span
              style={{
                fontSize: "11px",
                color: termMuted,
                fontFamily: "monospace",
                letterSpacing: "0.1em",
                display: "flex",
              }}
            >
              DOMAIN NAME
            </span>
            <span
              style={{
                fontSize: domainFontSize,
                fontWeight: 700,
                color: termFg,
                fontFamily: "monospace",
                letterSpacing: "-0.01em",
                lineHeight: 1.1,
                display: "flex",
                wordBreak: "break-all",
              }}
            >
              {query || "WHOIS Lookup"}
            </span>
          </div>
          <div
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <div
              style={{
                padding: "4px 12px",
                borderRadius: "4px",
                backgroundColor: "#1a3520",
                border: `1px solid ${termGreen}40`,
                display: "flex",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: termGreen,
                  fontFamily: "monospace",
                  fontWeight: 600,
                  display: "flex",
                }}
              >
                {queryType}
              </span>
            </div>
            <div
              style={{
                padding: "4px 12px",
                borderRadius: "4px",
                backgroundColor: "#1a1a1a",
                border: `1px solid ${termBorder}`,
                display: "flex",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: termMuted,
                  fontFamily: "monospace",
                  display: "flex",
                }}
              >
                LOOKUP
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${termBorder}`,
            paddingTop: "24px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              color: termMuted,
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            WHOIS / RDAP · Domain Intelligence Platform
          </span>
          <span
            style={{
              fontSize: "13px",
              color: termGreen,
              fontFamily: "monospace",
              fontWeight: 600,
              display: "flex",
            }}
          >
            {siteHost}
          </span>
        </div>
      </div>
    );
  } else if (styleVariant === 3) {
    const headerBg = isDark ? "#1d4ed8" : "#2563eb";

    content = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: bg,
        }}
      >
        <div
          style={{
            height: "80px",
            backgroundColor: headerBg,
            display: "flex",
            alignItems: "center",
            padding: "0 56px",
            gap: "14px",
            flexShrink: 0,
          }}
        >
          {logoW(38, "rgba(255,255,255,0.9)", "rgba(30,64,175,0.8)", 8)}
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "white",
              letterSpacing: "0.04em",
              display: "flex",
            }}
          >
            RDAP+WHOIS
          </span>
          <div style={{ flex: 1 }} />
          <div
            style={{
              padding: "5px 18px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              display: "flex",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "white",
                letterSpacing: "0.06em",
                display: "flex",
              }}
            >
              {queryType}
            </span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 64px",
            gap: "20px",
            backgroundImage: dotGrid,
            backgroundSize: "24px 24px",
          }}
        >
          <span
            style={{
              fontSize: domainFontSize,
              fontWeight: 700,
              color: fg,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              textAlign: "center",
              display: "flex",
              wordBreak: "break-all",
            }}
          >
            {query || "WHOIS Lookup Tool"}
          </span>
          <div
            style={{
              width: "64px",
              height: "4px",
              backgroundColor: headerBg,
              borderRadius: "9999px",
              display: "flex",
            }}
          />
          {!query && (
            <span
              style={{
                fontSize: "18px",
                color: muted,
                textAlign: "center",
                display: "flex",
              }}
            >
              Domain · IPv4 · IPv6 · ASN · CIDR
            </span>
          )}
        </div>

        <div
          style={{
            height: "68px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 56px",
            borderTop: `1px solid ${border}`,
            backgroundColor: cardBg,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "14px",
              color: muted,
              fontWeight: 500,
              display: "flex",
            }}
          >
            {siteHost} · Domain Intelligence
          </span>
          <span
            style={{
              fontSize: "13px",
              color: accent,
              fontWeight: 500,
              display: "flex",
            }}
          >
            NIC.RW 提供支持
          </span>
        </div>
      </div>
    );
  } else {
    content = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: bg,
          backgroundImage: dotGrid,
          backgroundSize: "24px 24px",
          padding: "52px 64px",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
        >
          {logoW(36, fg, bg, 8)}
          <span
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: muted,
              letterSpacing: "0.06em",
              display: "flex",
            }}
          >
            RDAP+WHOIS
          </span>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
          }}
        >
          <span
            style={{
              fontSize: domainFontSize,
              fontWeight: 700,
              color: fg,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              textAlign: "center",
              display: "flex",
              wordBreak: "break-all",
            }}
          >
            {query || "WHOIS Lookup Tool"}
          </span>
          {query ? (
            typePill
          ) : (
            <span
              style={{
                fontSize: "18px",
                color: muted,
                textAlign: "center",
                display: "flex",
              }}
            >
              Domain · IPv4 · IPv6 · ASN · CIDR
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${border}`,
            paddingTop: "24px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              color: muted,
              fontWeight: 500,
              display: "flex",
            }}
          >
            {siteHost} · Domain Intelligence Platform
          </span>
          <span
            style={{
              fontSize: "13px",
              color: accent,
              fontWeight: 500,
              display: "flex",
            }}
          >
            NIC.RW 提供支持
          </span>
        </div>
      </div>
    );
  }

  return new ImageResponse(content, { width: w, height: h });
}
