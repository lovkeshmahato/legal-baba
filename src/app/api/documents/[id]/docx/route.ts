import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { parseTemplateFieldSchema } from "@/lib/template-engine";
import { pickLocalized } from "@/lib/i18n-content";
import { tiptapToBlocks } from "@/lib/document-export/tiptap-to-blocks";
import { extractParties } from "@/lib/document-export/extract-parties";
import { buildDocx } from "@/lib/document-export/build-docx";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const locale = new URL(request.url).searchParams.get("locale") === "np" ? "np" : "en";

  const document = await prisma.generatedDocument.findUnique({
    where: { id },
    include: { template: true },
  });
  if (!document || document.userId !== session.user.id) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const fields = parseTemplateFieldSchema(document.template.fieldSchema);
  const parties = extractParties(fields, document.formData as Record<string, unknown>);
  const blocks = tiptapToBlocks(document.content);
  const title = pickLocalized(document.template.titleEn, document.template.titleNp, locale);

  const buffer = await buildDocx({
    title,
    blocks,
    parties,
    isGovernmentFormat: document.template.isGovernmentFormat,
    draftOnlyLabel:
      locale === "np"
        ? "यो कागजात फाइलिङका लागि तयार होइन — यो मस्यौदा मात्र हो।"
        : "This document is not ready to file — it is a draft only.",
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${document.template.slug}.docx"`,
    },
  });
}
