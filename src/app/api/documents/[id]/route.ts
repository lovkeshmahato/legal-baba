import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

const updateDocumentSchema = z.object({
  content: z.unknown(),
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

  await prisma.generatedDocument.update({
    where: { id },
    data: { content: parsed.data.content as never },
  });

  return NextResponse.json({ ok: true });
}
