"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("wizard.language");

  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-xs">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => router.replace(pathname, { locale: loc })}
          className={
            loc === locale
              ? "rounded bg-primary px-2 py-1 font-medium text-primary-foreground"
              : "rounded px-2 py-1 text-muted-foreground hover:text-foreground"
          }
          aria-current={loc === locale}
        >
          {loc === "en" ? t("en") : t("np")}
        </button>
      ))}
    </div>
  );
}
