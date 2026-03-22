import React from "react";

export interface SiteSettings {
  site_title: string;
  site_subtitle: string;
  site_description: string;
  site_footer: string;
  site_logo_text: string;
  site_icon_url: string;
  site_announcement: string;
  og_site_name: string;
  og_url: string;
  og_image: string;
  twitter_card: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  site_title: "Next Whois",
  site_subtitle: "专业的 WHOIS / RDAP 查询工具",
  site_description: "快速查询域名、IP、ASN、CIDR 的 WHOIS / RDAP 信息，支持多节点并行查询。",
  site_footer: "© 2024 Next Whois · WHOIS & RDAP Lookup Service",
  site_logo_text: "NEXT WHOIS",
  site_icon_url: "",
  site_announcement: "",
  og_site_name: "Next Whois",
  og_url: "",
  og_image: "",
  twitter_card: "summary_large_image",
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

    // Listen for cross-tab changes via localStorage
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) fetchSettings();
    }
    window.addEventListener("storage", onStorage);

    // Listen for same-tab change dispatch
    function onUpdate() { fetchSettings(); }
    window.addEventListener("site-settings-updated", onUpdate);

    // Periodic refresh every 60s as fallback
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

/** Call after saving settings to propagate to all tabs/windows */
export function notifySettingsUpdated() {
  // Same-tab dispatch
  window.dispatchEvent(new Event("site-settings-updated"));
  // Cross-tab via localStorage
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {}
}
