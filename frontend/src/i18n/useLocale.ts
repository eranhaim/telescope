import { useState, useEffect, useCallback } from "react";
import { translations, RTL_LOCALES } from "./translations";
import type { Locale, TranslationKey } from "./translations";

function detectLocale(): Locale {
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  const lang = tgLang || navigator.language?.split("-")[0] || "he";

  if (lang === "ar") return "ar";
  if (lang === "en") return "en";
  return "he";
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(detectLocale);

  useEffect(() => {
    const isRtl = RTL_LOCALES.includes(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey) => translations[locale][key],
    [locale]
  );

  return { locale, setLocale, t };
}
