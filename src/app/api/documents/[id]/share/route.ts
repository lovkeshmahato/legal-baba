import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { generateShareToken } from "@/lib/share-token";

async function loadOwnedDocument(id: string, userId: string) {
  const document = await prisma.generatedDocument.findUnique({ where: { id } });
  if (!document || document.userId !== userId) return null;
  return document;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const document = await loadOwnedDocument(id, session.user.id);
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const shareToken = document.shareToken ?? generateShareToken();
  if (!document.shareToken) {
    await prisma.generatedDocument.update({ where: { id }, data: { shareToken } });
  }

  return NextResponse.json({ shareToken });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const document = await loadOwnedDocument(id, session.user.id);
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  await prisma.generatedDocument.update({ where: { id }, data: { shareToken: null } });
  return NextResponse.json({ ok: true });
}
