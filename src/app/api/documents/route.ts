import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { parseTemplateFieldSchema, validateFormData } from "@/lib/template-engine";
import { toInputJson } from "@/lib/prisma-json";
import { rateLimit } from "@/lib/rate-limit";

const createDocumentSchema = z.object({
  templateSlug: z.string().min(1),
  language: z.enum(["EN", "NP", "BILINGUAL"]),
  formData: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit("documents.create", session.user.id, 30, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { templateSlug, language, formData } = parsed.data;

  const template = await prisma.documentTemplate.findUnique({
    where: { slug: templateSlug, active: true },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const fields = parseTemplateFieldSchema(template.fieldSchema);
  const errors = validateFormData(fields, formData);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed.", fieldErrors: errors }, { status: 400 });
  }

  const document = await prisma.generatedDocument.create({
    data: {
      userId: session.user.id,
      templateId: template.id,
      title: template.titleEn,
      language,
      status: "DRAFT",
      formData: toInputJson(formData),
      content: toInputJson({ type: "doc", content: [] }),
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "document.draft_created",
      entityType: "GeneratedDocument",
      entityId: document.id,
    },
  });

  return NextResponse.json({ id: document.id }, { status: 201 });
}
