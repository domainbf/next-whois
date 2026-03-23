import React from "react";

export interface SiteSettings {
  // Branding
  site_title: string;
  site_subtitle: string;
  site_description: string;
  site_keywords: string;
  site_footer: string;
  site_logo_text: string;
  site_icon_url: string;
  site_announcement: string;
  // OG / Social
  og_site_name: string;
  og_url: string;
  og_image: string;
  twitter_card: string;
  // Auth & access control
  allow_registration: string;
  require_login: string;
  disable_login: string;
  maintenance_mode: string;
  query_only_mode: string;
  hide_raw_whois: string;
  // Core feature toggles
  enable_feedback: string;
  enable_stamps: string;
  enable_sponsor: string;
  enable_share: string;
  enable_dns: string;
  enable_ip: string;
  enable_ssl: string;
  enable_tools: string;
  enable_remind: string;
  enable_links: string;
  enable_about: string;
  enable_changelog: string;
  enable_docs: string;
  // Home page content
  home_hero_title: string;
  home_hero_subtitle: string;
  home_placeholder: string;
  home_show_stats: string;
  // About page
  about_title: string;
  about_content: string;
  // Changelog page
  changelog_title: string;
  // Links page
  links_title: string;
  links_content: string;
  // Sponsor settings
  sponsor_page_title: string;
  sponsor_page_desc: string;
  sponsor_alipay_qr: string;
  sponsor_wechat_qr: string;
  sponsor_github_url: string;
  sponsor_extra_links: string;
  // SEO / Analytics
  analytics_google: string;
  analytics_umami: string;
  analytics_umami_src: string;
  custom_head_script: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  site_title: "Next Whois",
  site_subtitle: "专业的 WHOIS / RDAP 查询工具",
  site_description: "快速查询域名、IP、ASN、CIDR 的 WHOIS / RDAP 信息，支持多节点并行查询。",
  site_keywords: "Whois, RDAP, Lookup, Domain, IPv4, IPv6, ASN, CIDR",
  site_footer: "© 2024 Next Whois · WHOIS & RDAP Lookup Service",
  site_logo_text: "NEXT WHOIS",
  site_icon_url: "",
  site_announcement: "",
  og_site_name: "Next Whois",
  og_url: "",
  og_image: "",
  twitter_card: "summary_large_image",
  allow_registration: "1",
  require_login: "",
  disable_login: "",
  maintenance_mode: "",
  query_only_mode: "",
  hide_raw_whois: "",
  enable_feedback: "1",
  enable_stamps: "1",
  enable_sponsor: "1",
  enable_share: "1",
  enable_dns: "1",
  enable_ip: "1",
  enable_ssl: "1",
  enable_tools: "1",
  enable_remind: "1",
  enable_links: "1",
  enable_about: "1",
  enable_changelog: "1",
  enable_docs: "1",
  home_hero_title: "",
  home_hero_subtitle: "",
  home_placeholder: "",
  home_show_stats: "1",
  about_title: "",
  about_content: "",
  changelog_title: "",
  links_title: "",
  links_content: "",
  sponsor_page_title: "赞助支持",
  sponsor_page_desc: "感谢您对本项目的支持！您的赞助将帮助我们持续维护和改进服务。",
  sponsor_alipay_qr: "",
  sponsor_wechat_qr: "",
  sponsor_github_url: "",
  sponsor_extra_links: "",
  analytics_google: "",
  analytics_umami: "",
  analytics_umami_src: "",
  custom_head_script: "",
};

const STORAGE_KEY = "next_whois_settings_ts";

const SiteSettingsContext = React.createContext<SiteSettings>(DEFAULT_SETTINGS);

export function SiteSettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: Partial<SiteSettings>;
}) {
  const [settings, setSettings] = React.useState<SiteSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });

  const fetchSettings = React.useCallback(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    fetchSettings();

    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) fetchSettings();
    }
    window.addEventListener("storage", onStorage);

    function onUpdate() { fetchSettings(); }
    window.addEventListener("site-settings-updated", onUpdate);

    const timer = setInterval(fetchSettings, 60_000);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("site-settings-updated", onUpdate);
      clearInterval(timer);
    };
  }, [fetchSettings]);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettings {
  return React.useContext(SiteSettingsContext);
}

export function notifySettingsUpdated() {
  window.dispatchEvent(new Event("site-settings-updated"));
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {}
}
