import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { toInputJson } from "@/lib/prisma-json";

const updateDocumentSchema = z.object({
  content: z.unknown().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.generatedDocument.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const data: Prisma.GeneratedDocumentUpdateInput = {};
  if (parsed.data.content !== undefined) data.content = toInputJson(parsed.data.content);
  if (parsed.data.tags !== undefined) data.tags = { set: parsed.data.tags };
  if (parsed.data.archived) data.status = "ARCHIVED";

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  await prisma.generatedDocument.update({ where: { id }, data });

  return NextResponse.json({ ok: true });
}
