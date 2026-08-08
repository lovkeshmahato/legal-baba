import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { pickLocalized } from "@/lib/i18n-content";
import { DocumentCard } from "@/components/dashboard/document-card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

const ACTIVITY_LABELS: Record<string, { en: string; np: string }> = {
  "document.draft_created": { en: "Draft created", np: "ड्राफ्ट सिर्जना गरियो" },
  "document.generated": { en: "Document generated", np: "कागजात तयार गरियो" },
  "document.regenerated": { en: "Document regenerated", np: "कागजात पुनः तयार गरियो" },
  "document.downloaded_pdf": { en: "Downloaded PDF", np: "PDF डाउनलोड गरियो" },
  "document.downloaded_docx": { en: "Downloaded DOCX", np: "DOCX डाउनलोड गरियो" },
};

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { locale } = await params;
  const { tag } = await searchParams;

  const session = await getCurrentSession();
  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  const t = await getTranslations({ locale, namespace: "dashboard" });
  const userId = session!.user.id;

  const documents = await prisma.generatedDocument.findMany({
    where: {
      userId,
      status: { not: "ARCHIVED" },
      ...(tag ? { tags: { has: tag } } : {}),
    },
    include: { template: true },
    orderBy: { updatedAt: "desc" },
  });

  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags))).sort();

  const recentActivity = await prisma.auditLog.findMany({
    where: { userId, entityType: "GeneratedDocument" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const titleByDocId = new Map(
    documents.map((d) => [d.id, pickLocalized(d.template.titleEn, d.template.titleNp, locale)])
  );

  const drafts = documents.filter((d) => d.status === "DRAFT");
  const finished = documents.filter((d) => d.status !== "DRAFT");

  const toCardData = (doc: (typeof documents)[number]) => ({
    id: doc.id,
    title: pickLocalized(doc.template.titleEn, doc.template.titleNp, locale),
    status: doc.status,
    language: doc.language,
    version: doc.version,
    updatedAt: doc.updatedAt.toISOString(),
    tags: doc.tags,
    shareToken: doc.shareToken,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{locale === "np" ? "फिल्टर:" : "Filter:"}</span>
          {tag && (
            <Link href="/dashboard">
              <Badge variant="secondary">{locale === "np" ? "सबै" : "All"}</Badge>
            </Link>
          )}
          {allTags.map((t2) => (
            <Link key={t2} href={`/dashboard?tag=${encodeURIComponent(t2)}`}>
              <Badge variant={t2 === tag ? "default" : "outline"}>{t2}</Badge>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold">{t("drafts")}</h2>
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === "np" ? "कुनै ड्राफ्ट छैन।" : "No drafts."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {drafts.map((doc) => (
                  <DocumentCard key={doc.id} document={toCardData(doc)} locale={locale} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">{t("finalized")}</h2>
            {finished.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === "np" ? "कुनै कागजात छैन।" : "No documents yet."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {finished.map((doc) => (
                  <DocumentCard key={doc.id} document={toCardData(doc)} locale={locale} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside>
          <h2 className="mb-3 text-lg font-semibold">
            {locale === "np" ? "हालैका गतिविधि" : "Recent activity"}
          </h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locale === "np" ? "कुनै गतिविधि छैन।" : "No activity yet."}
            </p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="border-b border-border pb-2">
                  <p>
                    {ACTIVITY_LABELS[entry.action]
                      ? pickLocalized(
                          ACTIVITY_LABELS[entry.action].en,
                          ACTIVITY_LABELS[entry.action].np,
                          locale
                        )
                      : entry.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(entry.entityId && titleByDocId.get(entry.entityId)) ?? ""}{" "}
                    {new Date(entry.createdAt).toLocaleString(locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}
