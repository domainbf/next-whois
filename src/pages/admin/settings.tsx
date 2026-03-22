import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, type SiteSettings, notifySettingsUpdated } from "@/lib/site-settings";
import {
  RiLoader4Line, RiSaveLine, RiRefreshLine, RiImageLine,
  RiGlobalLine, RiFileTextLine, RiShareLine, RiTwitterXLine,
  RiMegaphoneLine, RiMailSendLine, RiCheckLine, RiToggleLine,
} from "@remixicon/react";

type FieldDef = {
  key: keyof SiteSettings;
  label: string;
  desc: string;
  placeholder: string;
  icon: React.ElementType;
};

const SECTIONS: {
  title: string;
  icon: React.ElementType;
  color: string;
  fields: FieldDef[];
}[] = [
  {
    title: "基础信息",
    icon: RiGlobalLine,
    color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
    fields: [
      { key: "site_title", label: "网站标题", desc: "显示在浏览器标签页和搜索结果中", placeholder: "Next Whois", icon: RiGlobalLine },
      { key: "site_logo_text", label: "Logo 文字", desc: "导航栏中显示的品牌名称", placeholder: "NEXT WHOIS", icon: RiGlobalLine },
      { key: "site_subtitle", label: "副标题", desc: "首页和登录页显示的副标题文字", placeholder: "专业的 WHOIS / RDAP 查询工具", icon: RiFileTextLine },
      { key: "site_description", label: "网站描述 (SEO)", desc: "SEO meta description，显示在搜索引擎结果中", placeholder: "快速查询域名、IP、ASN、CIDR...", icon: RiFileTextLine },
      { key: "site_footer", label: "页脚文字", desc: "页面底部版权/说明文字", placeholder: "© 2024 Next Whois", icon: RiFileTextLine },
    ],
  },
  {
    title: "Open Graph / 社交分享",
    icon: RiShareLine,
    color: "bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
    fields: [
      { key: "og_site_name", label: "og:site_name", desc: "链接预览中显示的站点名称", placeholder: "Next Whois", icon: RiShareLine },
      { key: "og_url", label: "og:url / 规范链接", desc: "网站的主域名，用于 og:url 和 canonical 标签", placeholder: "https://whois.example.com", icon: RiGlobalLine },
      { key: "og_image", label: "og:image 自定义图片", desc: "社交分享时显示的图片 URL（留空使用 /banner.png）", placeholder: "https://example.com/og-image.png", icon: RiImageLine },
      { key: "twitter_card", label: "Twitter Card 类型", desc: "summary 或 summary_large_image（推荐大图）", placeholder: "summary_large_image", icon: RiTwitterXLine },
    ],
  },
  {
    title: "图标与公告",
    icon: RiMegaphoneLine,
    color: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
    fields: [
      { key: "site_icon_url", label: "网站图标 URL", desc: "Favicon 图标的外部 URL（留空使用默认图标）", placeholder: "https://example.com/favicon.ico", icon: RiImageLine },
      { key: "site_announcement", label: "公告横幅内容", desc: "显示在页面顶部的公告文字（留空则不显示）", placeholder: "🎉 欢迎使用 Next Whois！", icon: RiMegaphoneLine },
    ],
  },
];

export default function AdminSettingsPage() {
  const [form, setForm] = React.useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [testingEmail, setTestingEmail] = React.useState(false);
  const [emailOk, setEmailOk] = React.useState<boolean | null>(null);

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

  return (
    <AdminLayout title="网站设置">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold">网站设置</h2>
          <p className="text-xs text-muted-foreground mt-0.5">修改网站标题、OG 标签、图标、公告等内容</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {SECTIONS.map(({ title, icon: SectionIcon, color, fields }) => (
              <div key={title} className="glass-panel border border-border rounded-2xl overflow-hidden">
                <div className={`px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30`}>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${color}`}>
                    <SectionIcon className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-bold">{title}</h3>
                </div>
                <div className="p-4 space-y-4">
                  {fields.map(({ key, label, desc, placeholder, icon: Icon }) => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <Label className="text-sm font-semibold leading-none">{label}</Label>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                        </div>
                      </div>
                      <Input
                        value={form[key]}
                        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="h-9 rounded-xl text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Feature flags */}
            <div className="glass-panel border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                  <RiToggleLine className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold">功能开关</h3>
              </div>
              <div className="p-4 space-y-0 divide-y divide-border/50">
                {([
                  { key: "allow_registration" as const, label: "开放注册", desc: "允许新用户自助注册账户", onColor: "bg-emerald-500", offColor: "bg-muted" },
                  { key: "require_login" as const, label: "登录才能搜索", desc: "未登录用户只能看到首页，搜索需要账户", onColor: "bg-amber-500", offColor: "bg-muted" },
                  { key: "enable_feedback" as const, label: "开放用户反馈", desc: "查询结果页显示「反馈问题」入口", onColor: "bg-emerald-500", offColor: "bg-muted" },
                  { key: "enable_stamps" as const, label: "开放品牌认领", desc: "用户可以申请为域名添加品牌标签", onColor: "bg-emerald-500", offColor: "bg-muted" },
                  { key: "enable_sponsor" as const, label: "开放赞助页面", desc: "在导航菜单显示赞助页面入口", onColor: "bg-rose-500", offColor: "bg-muted" },
                ] as const).map(({ key, label, desc, onColor, offColor }) => {
                  const enabled = form[key] === "1";
                  return (
                    <div key={key} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, [key]: enabled ? "" : "1" }))}
                        className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${enabled ? onColor : offColor}`}
                        aria-label={label}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Previews */}
            {(form.site_icon_url || form.og_image) && (
              <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-semibold">图片预览</h3>
                <div className="flex flex-wrap gap-4">
                  {form.site_icon_url && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground">网站图标</p>
                      <img src={form.site_icon_url} alt="favicon" className="w-10 h-10 rounded-lg object-contain border border-border"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                  {form.og_image && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground">OG 分享图片</p>
                      <img src={form.og_image} alt="og image" className="h-16 rounded-lg object-cover border border-border"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Link preview mock */}
            <div className="glass-panel border border-border rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">社交分享预览（模拟）</h3>
              <div className="border border-border rounded-xl overflow-hidden max-w-sm">
                <div className="bg-muted/40 h-24 flex items-center justify-center text-xs text-muted-foreground">
                  {form.og_image ? (
                    <img src={form.og_image} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <span>og:image（默认 /banner.png）</span>
                  )}
                </div>
                <div className="p-3 bg-background space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase">{form.og_url || "https://your-site.com"}</p>
                  <p className="text-sm font-bold leading-snug">{form.site_title || "Next Whois"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{form.site_description || form.site_subtitle || "专业的 WHOIS / RDAP 查询工具"}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">og:site_name: <span className="font-mono">{form.og_site_name || form.site_title || "—"}</span></p>
            </div>

            {/* Email test */}
            <div className="glass-panel border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 flex items-center gap-2.5 border-b border-border bg-muted/30">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                  <RiMailSendLine className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold">邮件系统</h3>
              </div>
              <div className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium">测试邮件发送</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    向管理员邮箱发送一封测试邮件，验证 Resend API 和发件域名配置是否正常。
                  </p>
                  {emailOk === true && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                      <RiCheckLine className="w-3.5 h-3.5" />邮件发送成功，请检查收件箱
                    </p>
                  )}
                  {emailOk === false && (
                    <p className="text-xs text-destructive mt-1.5">发送失败，请检查 RESEND_API_KEY 和发件域名配置</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="rounded-xl h-9 gap-2 shrink-0"
                >
                  {testingEmail
                    ? <><RiLoader4Line className="w-4 h-4 animate-spin" />发送中…</>
                    : <><RiMailSendLine className="w-4 h-4" />发送测试邮件</>}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button onClick={handleSave} disabled={saving} className="rounded-xl h-10 gap-2 font-semibold">
                {saving ? <><RiLoader4Line className="w-4 h-4 animate-spin" />保存中…</> : <><RiSaveLine className="w-4 h-4" />保存所有设置</>}
              </Button>
              <Button variant="outline" onClick={reset} disabled={saving} className="rounded-xl h-10 gap-2">
                <RiRefreshLine className="w-4 h-4" />重置默认
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
