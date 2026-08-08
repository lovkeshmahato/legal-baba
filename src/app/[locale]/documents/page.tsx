import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickLocalized } from "@/lib/i18n-content";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing.categories" });

  const categories = await prisma.documentCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      templates: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>

      <div className="flex flex-col gap-10">
        {categories.map((category) => (
          <section key={category.id}>
            <h2 className="mb-4 text-xl font-semibold">
              {pickLocalized(category.nameEn, category.nameNp, locale)}
            </h2>

            {category.templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === "np" ? "छिट्टै आउँदैछ।" : "Coming soon."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.templates.map((template) => (
                  <Link key={template.id} href={`/documents/${template.slug}`}>
                    <Card className="h-full transition-colors hover:border-primary">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">
                            {pickLocalized(template.titleEn, template.titleNp, locale)}
                          </CardTitle>
                          {template.isGovernmentFormat && (
                            <Badge variant="warning">Draft only</Badge>
                          )}
                        </div>
                        <CardDescription>
                          {pickLocalized(
                            template.descriptionEn ?? "",
                            template.descriptionNp ?? "",
                            locale
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="text-sm font-medium text-primary">
                          {locale === "np" ? "सुरु गर्नुहोस् →" : "Start →"}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
