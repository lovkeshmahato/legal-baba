import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pickLocalized } from "@/lib/i18n-content";
import { tiptapToBlocks } from "@/lib/document-export/tiptap-to-blocks";
import { ReadOnlyDocument } from "@/components/share/read-only-document";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SharedDocumentPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;

  const document = await prisma.generatedDocument.findUnique({
    where: { shareToken: token },
    include: { template: true },
  });
  if (!document) notFound();

  const title = pickLocalized(document.template.titleEn, document.template.titleNp, locale);
  const blocks = tiptapToBlocks(document.content);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Badge variant="secondary">{locale === "np" ? "हेर्ने-मात्र" : "View only"}</Badge>
      </div>

      {document.template.isGovernmentFormat && (
        <p className="mb-4 text-sm text-accent-foreground">
          {locale === "np"
            ? "यो कागजात फाइलिङका लागि तयार होइन — यो मस्यौदा मात्र हो।"
            : "This document is not ready to file — it is a draft only."}
        </p>
      )}

      <Card>
        <CardContent className="pt-6">
          <ReadOnlyDocument blocks={blocks} />
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        AI-generated draft — not a substitute for legal advice. Have this reviewed by a licensed
        advocate before signing or notarizing. / AI-निर्मित ड्राफ्ट — यो कानूनी सल्लाहको विकल्प
        होइन। हस्ताक्षर वा नोटरी गर्नुअघि लाइसेन्स प्राप्त अधिवक्ताबाट समीक्षा गराउनुहोस्।
      </p>
    </main>
  );
}
