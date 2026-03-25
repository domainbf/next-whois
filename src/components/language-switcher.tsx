import { useLocale, type Locale } from "@/lib/locale-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiEarthFill } from "@remixicon/react";

const languageNames: Record<Locale, string> = {
  en: "English",
  zh: "简体中文",
  "zh-tw": "繁體中文",
  de: "Deutsch",
  ru: "Русский",
  ja: "日本語",
  fr: "Français",
  ko: "한국어",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="group inline-flex items-center justify-center rounded-full p-2 pr-0 touch-manipulation active:scale-90 transition-transform duration-75">
          <RiEarthFill className="h-[1rem] w-[1rem] group-hover:scale-110 transition-all duration-300" />
          <span className="sr-only">Language</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {(Object.entries(languageNames) as [Locale, string][]).map(([key, name]) => (
          <DropdownMenuItem
            key={key}
            className={`text-xs ${key === locale ? "font-medium" : ""}`}
            onClick={() => setLocale(key)}
          >
            {name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
