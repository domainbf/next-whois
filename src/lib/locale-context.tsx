import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";

export const LOCALES = ["en", "zh", "zh-tw", "de", "ru", "ja", "fr", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
});

export function LocaleProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: string }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(
    (initialLocale || router.locale || "en") as Locale,
  );

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    if (match && LOCALES.includes(match[1] as Locale)) {
      setLocaleState(match[1] as Locale);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    setLocaleState(newLocale);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
