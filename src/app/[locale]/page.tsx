import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        {t("hero.title")}
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        {t("hero.subtitle")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/documents"
          className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground"
        >
          {t("hero.cta_primary")}
        </Link>
        <Link
          href="/documents"
          className="rounded-md border border-border px-6 py-3 font-medium"
        >
          {t("hero.cta_secondary")}
        </Link>
      </div>
    </main>
  );
}
