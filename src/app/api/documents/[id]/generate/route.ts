import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { generateDocument } from "@/lib/ai/generate-document";
import { validateFormData, parseTemplateFieldSchema } from "@/lib/template-engine";
import { toInputJson } from "@/lib/prisma-json";
import { rateLimit } from "@/lib/rate-limit";
import { checkFreeTextClause } from "@/lib/moderation";

const regenerateSchema = z.object({
  formData: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit("documents.generate", session.user.id, 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = regenerateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.generatedDocument.findUnique({
    where: { id },
    include: { template: { include: { clauses: true } } },
  });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const formData = (parsed.data.formData ?? existing.formData) as Record<string, unknown>;

  const fields = parseTemplateFieldSchema(existing.template.fieldSchema);
  const fieldErrors = validateFormData(fields, formData);
  if (fieldErrors.length > 0) {
    return NextResponse.json({ error: "Validation failed.", fieldErrors }, { status: 400 });
  }

  const customClause = typeof formData.customClause === "string" ? formData.customClause : "";
  if (customClause.trim()) {
    const moderation = await checkFreeTextClause(customClause);
    if (!moderation.allowed) {
      await prisma.moderationQueueItem.create({
        data: {
          userId: session.user.id,
          generatedDocumentId: existing.id,
          inputText: customClause,
          flaggedReason: moderation.reason,
          status: "REJECTED",
        },
      });
      return NextResponse.json(
        {
          error:
            "Your custom clause request couldn't be processed — it doesn't read as a legal document clause. Please rephrase it.",
        },
        { status: 422 }
      );
    }
  }

  let content: Record<string, unknown>;
  let aiFlags: unknown[];
  try {
    ({ content, aiFlags } = await generateDocument({
      template: existing.template,
      clauses: existing.template.clauses,
      formData,
      language: existing.language,
    }));
  } catch (error) {
    console.error("AI generation failed", error);
    return NextResponse.json(
      { error: "The AI drafting engine could not generate this document. Please try again." },
      { status: 502 }
    );
  }

  const isRegenerate = existing.status !== "DRAFT";

  const document = isRegenerate
    ? await prisma.generatedDocument.create({
        data: {
          userId: existing.userId,
          orgId: existing.orgId,
          templateId: existing.templateId,
          title: existing.title,
          language: existing.language,
          status: "GENERATED",
          version: existing.version + 1,
          previousVersionId: existing.id,
          formData: toInputJson(formData),
          content: toInputJson(content),
          aiFlags: toInputJson(aiFlags),
        },
      })
    : await prisma.generatedDocument.update({
        where: { id: existing.id },
        data: {
          status: "GENERATED",
          formData: toInputJson(formData),
          content: toInputJson(content),
          aiFlags: toInputJson(aiFlags),
        },
      });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: isRegenerate ? "document.regenerated" : "document.generated",
      entityType: "GeneratedDocument",
      entityId: document.id,
    },
  });

  return NextResponse.json({ id: document.id, content, aiFlags });
}
