import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { pickLocalized } from "@/lib/i18n-content";
import { DocumentEditorClient } from "@/components/review/document-editor-client";
import type { AiFlag } from "@/types/template-engine";

export default async function DocumentReviewPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const session = await getCurrentSession();
  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  const document = await prisma.generatedDocument.findUnique({
    where: { id },
    include: { template: true },
  });

  if (!document || document.userId !== session!.user.id) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {pickLocalized(document.template.titleEn, document.template.titleNp, locale)}
        </h1>
        {document.template.isGovernmentFormat && (
          <p className="mt-1 text-sm text-accent-foreground">
            {locale === "np"
              ? "यो कागजात फाइलिङका लागि तयार होइन — यो मस्यौदा मात्र हो।"
              : "This document is not ready to file — it is a draft only."}
          </p>
        )}
      </div>

      <DocumentEditorClient
        documentId={document.id}
        initialContent={document.content as Record<string, unknown>}
        initialFlags={(document.aiFlags as AiFlag[] | null) ?? []}
        locale={locale}
        language={document.language}
      />
    </main>
  );
}
