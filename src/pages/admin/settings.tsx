import React from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import { RiLoader4Line, RiSaveLine, RiRefreshLine, RiImageLine, RiGlobalLine, RiFileTextLine } from "@remixicon/react";

const FIELDS: { key: keyof SiteSettings; label: string; desc: string; placeholder: string; icon: React.ElementType }[] = [
  { key: "site_title", label: "网站标题", desc: "显示在浏览器标签页和搜索结果中", placeholder: "Next Whois", icon: RiGlobalLine },
  { key: "site_logo_text", label: "Logo 文字", desc: "导航栏中显示的品牌文字", placeholder: "NEXT WHOIS", icon: RiGlobalLine },
  { key: "site_subtitle", label: "副标题", desc: "首页和登录页显示的副标题", placeholder: "专业的 WHOIS / RDAP 查询工具", icon: RiFileTextLine },
  { key: "site_description", label: "网站描述", desc: "SEO 描述，显示在搜索引擎结果中", placeholder: "快速查询域名、IP、ASN、CIDR...", icon: RiFileTextLine },
  { key: "site_footer", label: "页脚文字", desc: "页面底部版权/说明文字", placeholder: "© 2024 Next Whois", icon: RiFileTextLine },
  { key: "site_icon_url", label: "网站图标 URL", desc: "Favicon 图标的外部 URL（留空使用默认）", placeholder: "https://example.com/favicon.ico", icon: RiImageLine },
  { key: "site_announcement", label: "公告横幅", desc: "首页顶部公告（留空不显示）", placeholder: "系统公告内容...", icon: RiFileTextLine },
];

export default function AdminSettingsPage() {
  const [form, setForm] = React.useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

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
      toast.success("设置已保存");
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
          <p className="text-xs text-muted-foreground mt-0.5">修改网站标题、图标、描述等文字内容</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><RiLoader4Line className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            {FIELDS.map(({ key, label, desc, placeholder, icon: Icon }) => (
              <div key={key} className="glass-panel border border-border rounded-2xl p-5 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold leading-none">{label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
                <Input
                  value={form[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="h-10 rounded-xl text-sm"
                />
              </div>
            ))}

            {/* Preview */}
            {form.site_icon_url && (
              <div className="glass-panel border border-border rounded-2xl p-4 flex items-center gap-3">
                <p className="text-xs text-muted-foreground">图标预览：</p>
                <img
                  src={form.site_icon_url}
                  alt="favicon preview"
                  className="w-8 h-8 rounded object-contain border border-border"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="rounded-xl h-10 gap-2 font-semibold">
                {saving ? <><RiLoader4Line className="w-4 h-4 animate-spin" />保存中…</> : <><RiSaveLine className="w-4 h-4" />保存设置</>}
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
