import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const locales = ["en", "zh", "zh-tw", "de", "ru", "ja", "fr", "ko"];
const defaultLocale = "en";

const COUNTRY_LOCALE_MAP: Record<string, string> = {
  CN: "zh", HK: "zh-tw", TW: "zh-tw", MO: "zh-tw", SG: "zh",
  JP: "ja", KR: "ko",
  DE: "de", AT: "de", CH: "de", LI: "de",
  RU: "ru", BY: "ru", KZ: "ru",
  FR: "fr", BE: "fr", LU: "fr", MC: "fr",
};

function getLocale(request: NextRequest): string {
  const storedLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (storedLocale && locales.includes(storedLocale)) {
    return storedLocale;
  }

  const country =
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("x-country-code") ||
    "";
  if (country && COUNTRY_LOCALE_MAP[country.toUpperCase()]) {
    return COUNTRY_LOCALE_MAP[country.toUpperCase()];
  }

  const acceptLanguage = request.headers.get("accept-language") || "";
  if (!acceptLanguage) return defaultLocale;

  const languageMap: Record<string, string> = {
    "zh-tw": "zh-tw", "zh-hk": "zh-tw", "zh-mo": "zh-tw",
    "zh-cn": "zh", "zh-sg": "zh", "zh": "zh",
  };

  let headers = { "accept-language": acceptLanguage };
  let languages = new Negotiator({ headers }).languages();

  const mappedLanguages = languages.map((lang) => {
    const lower = lang.toLowerCase();
    return languageMap[lower] || lower.split("-")[0];
  });

  try {
    return match(mappedLanguages, locales, defaultLocale);
  } catch {
    return defaultLocale;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const currentLocale = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  const pathWithoutLocale = currentLocale
    ? pathname.replace(`/${currentLocale}`, "")
    : pathname;

  const isDomainQuery =
    pathWithoutLocale.split("/").length === 2 && pathWithoutLocale !== "/";
  if (isDomainQuery) return;

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );
  if (pathnameHasLocale) return;

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  const response = NextResponse.redirect(request.nextUrl);
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|icons|images|.*\\..*).*)"],
};
