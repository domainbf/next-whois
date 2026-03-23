import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextArea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, type SiteSettings, notifySettingsUpdated } from "@/lib/site-settings";
import {
  RiLoader4Line, RiSaveLine, RiRefreshLine, RiImageLine,
  RiGlobalLine, RiFileTextLine, RiShareLine, RiTwitterXLine,
  RiMegaphoneLine, RiMailSendLine, RiCheckLine, RiToggleLine,
  RiHomeLine, RiInformationLine, RiHistoryLine, RiLinksLine,
  RiHeartLine, RiBarChartLine, RiSearchLine, RiCodeBoxLine,
  RiShieldLine, RiPaletteLine, RiEyeLine, RiUploadLine, RiCloseLine,
} from "@remixicon/react";

// ── Client-side image compression helper ────────────────────────────────────
// Resizes to maxPx on the longest side (preserving aspect ratio) and
// re-encodes as WebP at `quality` (0-1). Falls back to PNG for small images.
async function compressImage(
  file: File,
  maxPx = 2048,
  quality = 0.9,
): Promise<{ dataUrl: string; originalKB: number; compressedKB: number }> {
  const originalKB = Math.round(file.size / 1024);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round((height / width) * maxPx); width = maxPx; }
        else                 { width = Math.round((width / height) * maxPx); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      // Try WebP first (best compression); fall back to PNG for transparency
      const webp = canvas.toDataURL("image/webp", quality);
      const dataUrl = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
      const compressedKB = Math.round((dataUrl.length * 3) / 4 / 1024);
      resolve({ dataUrl, originalKB, compressedKB });
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("Invalid image")); };
    img.src = blobUrl;
  });
}

// ── ImageUploadField component ───────────────────────────────────────────────
function ImageUploadField({
  value,
  onChange,
  placeholder,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("请选择图片文件"); return; }
    setUploading(true);
    try {
      const { dataUrl, originalKB, compressedKB } = await compressImage(file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, hint }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "上传失败"); }
      const { url } = await res.json();
      onChange(url);
      const saved = originalKB > 0 ? Math.round((1 - compressedKB / originalKB) * 100) : 0;
      const msg = saved > 5
        ? `上传成功，已压缩 ${saved}%（${originalKB} KB → ${compressedKB} KB）`
        : `上传成功（${compressedKB} KB）`;
      toast.success(msg);
    } catch (e: any) {
      toast.error(e.message || "上传失败");
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const isDataUrl = value.startsWith("data:image/");
  const previewSrc = value && (value.startsWith("/") || value.startsWith("http") || isDataUrl) ? value : null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 rounded-xl text-sm flex-1 min-w-0"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-xl px-3 gap-1.5 shrink-0 text-xs"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
        >
          {uploading
            ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
            : <RiUploadLine className="w-3.5 h-3.5" />}
          {uploading ? "压缩中…" : "上传"}
        </Button>
      </div>
      {previewSrc && (
        <div className="relative inline-block group">
          <img
            src={previewSrc}
            alt="preview"
            className="h-16 max-w-[200px] rounded-lg border border-border object-contain bg-muted/30"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <RiCloseLine className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

type FieldDef = {
  key: keyof SiteSettings;
  label: string;
  desc: string;
  placeholder: string;
  icon: React.ElementType;
  multiline?: boolean;
  isImage?: boolean;
};

type ToggleDef = {
  key: keyof SiteSettings;
  label: string;
  desc: string;
  onColor: string;
};

type Section = {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  fields?: FieldDef[];
  toggles?: ToggleDef[];
};

const SECTIONS: Section[] = [
  {
    id: "branding",
    title: "品牌与基础信息",
    icon: RiPaletteLine,
    color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
    fields: [
      { key: "site_title", label: "网站标题", desc: "浏览器标签页和搜索结果中显示的标题", placeholder: "Next Whois", icon: RiGlobalLine },
      { key: "site_logo_text", label: "Logo 文字", desc: "导航栏中显示的品牌名称（留空使用网站标题）", placeholder: "NEXT WHOIS", icon: RiGlobalLine },
      { key: "site_subtitle", label: "网站副标题", desc: "首页 Hero 区域下方的副标题文字", placeholder: "专业的 WHOIS / RDAP 查询工具", icon: RiFileTextLine },
      { key: "site_description", label: "网站描述 (SEO)", desc: "搜索引擎结果中显示的描述文字", placeholder: "快速查询域名、IP、ASN、CIDR...", icon: RiFileTextLine },
      { key: "site_keywords", label: "搜索关键词 (SEO)", desc: "meta keywords 标签内容，多个关键词用英文逗号分隔", placeholder: "Whois, RDAP, Lookup, Domain, IPv4, ASN", icon: RiSearchLine },
      { key: "site_footer", label: "页脚文字", desc: "页面底部显示的版权/说明文字", placeholder: "© 2024 Next Whois", icon: RiFileTextLine },
      { key: "site_icon_url", label: "网站图标", desc: "Favicon 图标（支持直接上传，留空使用默认图标）", placeholder: "https://example.com/favicon.ico", icon: RiImageLine, isImage: true },
    ],
  },
  {
    id: "home",
    title: "首页内容",
    icon: RiHomeLine,
    color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
    fields: [
      { key: "home_hero_title", label: "首页大标题", desc: "覆盖默认大标题文字（留空使用默认）", placeholder: "WHOIS / RDAP 查询", icon: RiHomeLine },
      { key: "home_hero_subtitle", label: "首页副标题", desc: "覆盖首页 Hero 区域的副标题（留空使用 site_subtitle）", placeholder: "快速查询域名、IP、ASN...", icon: RiFileTextLine },
      { key: "home_placeholder", label: "搜索框占位文字", desc: "搜索输入框内的提示文字（留空使用默认）", placeholder: "输入域名、IP、ASN...", icon: RiSearchLine },
    ],
    toggles: [
      { key: "home_show_stats", label: "显示查询统计数字", desc: "首页显示总查询次数等统计数据", onColor: "bg-emerald-500" },
    ],
  },
  {
    id: "announcement",
    title: "公告横幅",
    icon: RiMegaphoneLine,
    color: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
    fields: [
      { key: "site_announcement", label: "公告横幅内容", desc: "显示在页面顶部的公告文字（留空则不显示公告条）", placeholder: "🎉 欢迎使用 Next Whois！", icon: RiMegaphoneLine },
    ],
  },
  {
    id: "og",
    title: "社交分享 / Open Graph",
    icon: RiShareLine,
    color: "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
    fields: [
      { key: "og_site_name", label: "og:site_name", desc: "链接预览中显示的站点名称", placeholder: "Next Whois", icon: RiShareLine },
      { key: "og_url", label: "规范链接 (og:url)", desc: "网站主域名，用于 og:url 和 canonical 标签", placeholder: "https://whois.example.com", icon: RiGlobalLine },
      { key: "og_image", label: "分享图片", desc: "社交分享时显示的图片（支持直接上传，留空使用 /banner.png）", placeholder: "https://example.com/og-image.png", icon: RiImageLine, isImage: true },
      { key: "twitter_card", label: "Twitter Card 类型", desc: "summary 或 summary_large_image（推荐大图）", placeholder: "summary_large_image", icon: RiTwitterXLine },
    ],
  },
  {
    id: "about",
    title: "关于页面",
    icon: RiInformationLine,
    color: "bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400",
    fields: [
      { key: "about_title", label: "关于页面标题", desc: "覆盖默认标题（留空使用默认）", placeholder: "关于 Next Whois", icon: RiInformationLine },
      { key: "about_content", label: "关于页面额外内容", desc: "在关于页面底部追加显示的 HTML 或 Markdown 内容（留空则不显示）", placeholder: "<p>补充说明...</p>", icon: RiFileTextLine, multiline: true },
    ],
  },
  {
    id: "changelog",
    title: "更新日志页面",
    icon: RiHistoryLine,
    color: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400",
    fields: [
      { key: "changelog_title", label: "更新日志标题", desc: "覆盖默认标题（留空使用默认）", placeholder: "更新日志", icon: RiHistoryLine },
    ],
  },
  {
    id: "links",
    title: "外部链接页面",
    icon: RiLinksLine,
    color: "bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400",
    fields: [
      { key: "links_title", label: "链接页面标题", desc: "覆盖默认标题（留空使用默认）", placeholder: "友情链接", icon: RiLinksLine },
      { key: "links_content", label: "链接页面描述", desc: "链接页面顶部的描述文字（留空则不显示）", placeholder: "以下是相关资源和友情链接...", icon: RiFileTextLine, multiline: true },
    ],
  },
  {
    id: "sponsor",
    title: "赞助页面",
    icon: RiHeartLine,
    color: "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
    fields: [
      { key: "sponsor_page_title", label: "赞助页面标题", desc: "赞助页面的主标题文字", placeholder: "赞助支持", icon: RiHeartLine },
      { key: "sponsor_page_desc", label: "赞助页面描述", desc: "赞助页面的描述/说明文字", placeholder: "感谢您对本项目的支持！", icon: RiFileTextLine, multiline: true },
      { key: "sponsor_alipay_qr", label: "支付宝收款码", desc: "支付宝收款二维码（支持直接上传）", placeholder: "https://example.com/alipay-qr.png", icon: RiImageLine, isImage: true },
      { key: "sponsor_wechat_qr", label: "微信收款码", desc: "微信收款二维码（支持直接上传）", placeholder: "https://example.com/wechat-qr.png", icon: RiImageLine, isImage: true },
      { key: "sponsor_github_url", label: "GitHub Sponsors 链接", desc: "GitHub Sponsors 主页链接（显示 GitHub 赞助按钮）", placeholder: "https://github.com/sponsors/yourname", icon: RiLinksLine },
      { key: "sponsor_paypal_url", label: "PayPal 收款链接", desc: "PayPal.me 或 PayPal 付款链接（显示 PayPal 赞助按钮）", placeholder: "https://paypal.me/yourname", icon: RiLinksLine },
      { key: "sponsor_crypto_btc", label: "BTC 钱包地址", desc: "Bitcoin 收款地址（留空隐藏）", placeholder: "bc1q...", icon: RiLinksLine },
      { key: "sponsor_crypto_eth", label: "ETH 钱包地址", desc: "Ethereum 收款地址（留空隐藏）", placeholder: "0x...", icon: RiLinksLine },
      { key: "sponsor_crypto_usdt", label: "USDT 钱包地址", desc: "Tether (TRC20/ERC20) 收款地址（留空隐藏）", placeholder: "T...", icon: RiLinksLine },
      { key: "sponsor_crypto_okx", label: "OKX / Web3 钱包地址", desc: "OKX 或其他 Web3 钱包地址（留空隐藏）", placeholder: "0x...", icon: RiLinksLine },
      { key: "sponsor_extra_links", label: "其他赞助方式 (JSON)", desc: `额外赞助链接，JSON 格式：[{"label":"Ko-fi","url":"https://ko-fi.com/..."}]`, placeholder: `[{"label":"Ko-fi","url":"https://ko-fi.com/..."}]`, icon: RiLinksLine },
    ],
  },
  {
    id: "analytics",
    title: "统计分析",
    icon: RiBarChartLine,
    color: "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400",
    fields: [
      { key: "analytics_google", label: "Google Analytics ID", desc: "Google Analytics 4 的测量 ID，如 G-XXXXXXXXXX（留空禁用）", placeholder: "G-XXXXXXXXXX", icon: RiBarChartLine },
      { key: "analytics_umami", label: "Umami Website ID", desc: "Umami 统计的 Website ID（留空禁用）", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", icon: RiBarChartLine },
      { key: "analytics_umami_src", label: "Umami 脚本地址", desc: "自托管 Umami 的脚本 URL（留空使用默认云服务）", placeholder: "https://umami.example.com/script.js", icon: RiCodeBoxLine },
      { key: "custom_head_script", label: "自定义 <head> 代码", desc: "注入到所有页面 <head> 中的自定义 HTML/JS 代码（谨慎使用）", placeholder: "<!-- 自定义脚本/像素代码 -->", icon: RiCodeBoxLine, multiline: true },
    ],
  },
];

const FEATURE_GROUPS: { title: string; icon: React.ElementType; color: string; items: ToggleDef[] }[] = [
  {
    title: "访问控制",
    icon: RiShieldLine,
    color: "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400",
    items: [
      { key: "allow_registration", label: "开放注册", desc: "允许新用户自助注册账户（关闭后注册页显示提示，已有账号不受影响）", onColor: "bg-emerald-500" },
      { key: "require_login", label: "登录后才可查询", desc: "未登录访客无法进行任何查询，仅可浏览首页", onColor: "bg-amber-500" },
      { key: "disable_login", label: "禁用登录入口", desc: "隐藏导航栏登录按钮并关闭登录页；管理员仍可通过直接访问 /login 登录", onColor: "bg-red-500" },
      { key: "maintenance_mode", label: "维护模式", desc: "对所有非管理员用户显示「维护中」提示页，站点暂停对外服务", onColor: "bg-orange-500" },
      { key: "query_only_mode", label: "纯查询模式", desc: "隐藏用户账户、控制台、历史记录等功能，仅保留域名查询核心功能", onColor: "bg-violet-500" },
      { key: "hide_raw_whois", label: "隐藏原始 WHOIS", desc: "查询结果不显示原始 WHOIS / RDAP 报文，仅展示解析后的结构化信息", onColor: "bg-slate-500" },
    ],
  },
  {
    title: "核心查询功能",
    icon: RiSearchLine,
    color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
    items: [
      { key: "enable_feedback", label: "结果反馈入口", desc: "查询结果页底部显示「反馈问题」按钮", onColor: "bg-emerald-500" },
      { key: "enable_share", label: "分享按钮", desc: "查询结果页显示分享/导出功能入口", onColor: "bg-emerald-500" },
      { key: "enable_stamps", label: "品牌认领 (Stamps)", desc: "允许用户为域名申请添加品牌标签", onColor: "bg-emerald-500" },
      { key: "enable_remind", label: "到期提醒", desc: "在导航和查询结果中显示域名到期订阅提醒功能", onColor: "bg-emerald-500" },
    ],
  },
  {
    title: "导航页面开关",
    icon: RiEyeLine,
    color: "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
    items: [
      { key: "enable_dns", label: "DNS 查询页", desc: "显示 DNS 解析查询工具入口", onColor: "bg-emerald-500" },
      { key: "enable_ip", label: "IP 查询页", desc: "显示 IP 信息查询工具入口", onColor: "bg-emerald-500" },
      { key: "enable_ssl", label: "SSL 检测页", desc: "显示 SSL 证书检测工具入口", onColor: "bg-emerald-500" },
      { key: "enable_tools", label: "工具中心页", desc: "显示综合工具集合页入口", onColor: "bg-emerald-500" },
      { key: "enable_about", label: "关于页面", desc: "在导航中显示关于页面链接", onColor: "bg-emerald-500" },
      { key: "enable_changelog", label: "更新日志页", desc: "在导航中显示更新日志链接", onColor: "bg-emerald-500" },
      { key: "enable_docs", label: "API 文档页", desc: "在导航中显示 API 文档链接", onColor: "bg-emerald-500" },
      { key: "enable_links", label: "外部链接页", desc: "在导航中显示友情链接/外部链接页面", onColor: "bg-emerald-500" },
      { key: "enable_sponsor", label: "赞助页面", desc: "在导航中显示赞助支持页面入口", onColor: "bg-rose-500" },
    ],
  },
  {
    title: "首页展示",
    icon: RiHomeLine,
    color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
    items: [
      { key: "home_show_stats", label: "显示统计数字", desc: "首页显示总查询次数等实时统计数据", onColor: "bg-emerald-500" },
    ],
  },
];

function Toggle({ value, onChange, onColor }: { value: boolean; onChange: (v: boolean) => void; onColor: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        value ? onColor : "bg-muted",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          value ? "translate-x-4" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [form, setForm] = React.useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testingEmail, setTestingEmail] = React.useState(false);
  const [emailOk, setEmailOk] = React.useState<boolean | null>(null);
  const [activeSection, setActiveSection] = React.useState("branding");

  const set = (key: keyof SiteSettings, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));
  const toggle = (key: keyof SiteSettings, value: boolean) =>
    setForm(prev => ({ ...prev, [key]: value ? "1" : "" }));
  const isOn = (key: keyof SiteSettings) => form[key] === "1";

  async function handleTestEmail() {
    setTestingEmail(true);
    setEmailOk(null);
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setEmailOk(true);
        toast.success(`测试邮件已发送至 ${data.to}`);
      } else {
        setEmailOk(false);
        toast.error(data.error || "发送失败");
      }
    } catch {
      setEmailOk(false);
      toast.error("网络错误，发送失败");
    } finally {
      setTestingEmail(false);
    }
  }

  React.useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => {
        if (data.settings) setForm({ ...DEFAULT_SETTINGS, ...data.settings });
      })
      .catch(() => toast.error("加载设置失败"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      notifySettingsUpdated();
      toast.success("设置已保存，已同步到所有页面");
    } catch (e: any) {
      toast.error(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setForm(DEFAULT_SETTINGS);
    toast.info("已重置为默认值（尚未保存）");
  }

  const allSections = [
    ...SECTIONS.map(s => ({ id: s.id, title: s.title, icon: s.icon })),
    { id: "features", title: "功能开关", icon: RiToggleLine },
    { id: "email", title: "邮件系统", icon: RiMailSendLine },
  ];

  return (
    <AdminLayout title="网站设置">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">网站设置</h2>
            <p className="text-xs text-muted-foreground mt-0.5">全面配置网站内容、功能开关、分析统计等</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={reset} disabled={saving || loading} className="rounded-xl h-9 gap-2 text-sm">
                <RiRefreshLine className="w-4 h-4" />重置默认
              </Button>
              <Button onClick={handleSave} disabled={saving || loading} className="rounded-xl h-9 gap-2 text-sm font-semibold">
                {saving ? <><RiLoader4Line className="w-4 h-4 animate-spin" />保存中…</> : <><RiSaveLine className="w-4 h-4" />保存所有设置</>}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/70 text-right">
              点击保存后立即写入数据库 · 当前浏览器即时生效 · 其他会话 60 秒内同步
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex gap-5">
            {/* Sidebar navigation */}
            <div className="hidden lg:flex flex-col gap-1 w-44 shrink-0">
              {allSections.map(({ id, title, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={[
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left transition-all",
                    activeSection === id
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  ].join(" ")}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{title}</span>
                </button>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-5">
              {/* Mobile section selector */}
              <div className="lg:hidden">
                <select
                  value={activeSection}
                  onChange={e => setActiveSection(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border bg-background px-3 text-sm"
                >
                  {allSections.map(({ id, title }) => (
                    <option key={id} value={id}>{title}</option>
                  ))}
                </select>
              </div>

              {/* Text/content sections */}
              {SECTIONS.filter(s => s.id === activeSection).map(section => {
                const SectionIcon = section.icon;
                return (
                  <div key={section.id} className="space-y-4">
                    <div className="glass-panel border border-border rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${section.color}`}>
                          <SectionIcon className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold">{section.title}</h3>
                      </div>
                      <div className="p-5 space-y-5">
                        {section.fields?.map(({ key, label, desc, placeholder, icon: Icon, multiline, isImage }) => (
                          <div key={key} className="space-y-1.5">
                            <div className="flex items-start gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <div>
                                <Label className="text-sm font-semibold leading-none">{label}</Label>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                              </div>
                            </div>
                            {isImage ? (
                              <ImageUploadField
                                value={form[key]}
                                onChange={v => set(key, v)}
                                placeholder={placeholder}
                                hint={key}
                              />
                            ) : multiline ? (
                              <TextArea
                                value={form[key]}
                                onChange={e => set(key, e.target.value)}
                                placeholder={placeholder}
                                className="rounded-xl text-sm min-h-[90px] resize-y"
                              />
                            ) : (
                              <Input
                                value={form[key]}
                                onChange={e => set(key, e.target.value)}
                                placeholder={placeholder}
                                className="h-9 rounded-xl text-sm"
                              />
                            )}
                          </div>
                        ))}
                        {section.toggles?.map(({ key, label, desc, onColor }) => (
                          <div key={key} className="flex items-center justify-between gap-4 py-1">
                            <div>
                              <p className="text-sm font-semibold">{label}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                            </div>
                            <Toggle value={isOn(key)} onChange={v => toggle(key, v)} onColor={onColor} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Features section */}
              {activeSection === "features" && (
                <div className="space-y-4">
                  {FEATURE_GROUPS.map(group => {
                    const GroupIcon = group.icon;
                    return (
                      <div key={group.title} className="glass-panel border border-border rounded-2xl overflow-hidden">
                        <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${group.color}`}>
                            <GroupIcon className="w-3.5 h-3.5" />
                          </div>
                          <h3 className="text-sm font-bold">{group.title}</h3>
                        </div>
                        <div className="divide-y divide-border/50">
                          {group.items.map(({ key, label, desc, onColor }) => (
                            <div key={key} className="flex items-center justify-between gap-4 px-5 py-3">
                              <div>
                                <p className="text-sm font-semibold">{label}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                              </div>
                              <Toggle value={isOn(key)} onChange={v => toggle(key, v)} onColor={onColor} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Email section */}
              {activeSection === "email" && (
                <div className="glass-panel border border-border rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                      <RiMailSendLine className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-bold">邮件系统</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-sm font-semibold">测试邮件发送</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        向管理员邮箱发送一封测试邮件，验证 Resend API 和发件域名配置是否正常工作。
                      </p>
                      {emailOk === true && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                          <RiCheckLine className="w-3.5 h-3.5" />邮件发送成功，请检查收件箱
                        </p>
                      )}
                      {emailOk === false && (
                        <p className="text-xs text-destructive mt-2">发送失败，请检查 RESEND_API_KEY 和发件域名配置</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleTestEmail}
                      disabled={testingEmail}
                      className="rounded-xl h-9 gap-2"
                    >
                      {testingEmail
                        ? <><RiLoader4Line className="w-4 h-4 animate-spin" />发送中…</>
                        : <><RiMailSendLine className="w-4 h-4" />发送测试邮件</>}
                    </Button>
                    <div className="mt-2 p-3 rounded-xl bg-muted/40 border border-border/60">
                      <p className="text-xs font-medium mb-1">邮件系统环境变量</p>
                      <p className="text-[11px] text-muted-foreground">
                        邮件发送功能依赖以下环境变量：<br />
                        <code className="font-mono">RESEND_API_KEY</code> — Resend API 密钥<br />
                        <code className="font-mono">RESEND_FROM</code> — 发件人地址（如 noreply@yourdomain.com）<br />
                        <code className="font-mono">ADMIN_EMAIL</code> — 管理员邮箱（接收通知和测试邮件）
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Save bar at bottom */}
              <div className="flex items-center gap-3 pt-2 border-t border-border/40">
                <Button onClick={handleSave} disabled={saving} className="rounded-xl h-9 gap-2 font-semibold">
                  {saving ? <><RiLoader4Line className="w-4 h-4 animate-spin" />保存中…</> : <><RiSaveLine className="w-4 h-4" />保存所有设置</>}
                </Button>
                <Button variant="outline" onClick={reset} disabled={saving} className="rounded-xl h-9 gap-2">
                  <RiRefreshLine className="w-4 h-4" />重置默认
                </Button>
                <p className="text-xs text-muted-foreground ml-auto hidden sm:block">保存后设置将实时同步到所有用户页面</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
