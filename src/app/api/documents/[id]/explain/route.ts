import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { anthropic, DEFAULT_MODEL } from "@/lib/anthropic";
import { rateLimit } from "@/lib/rate-limit";

const explainSchema = z.object({
  text: z.string().min(1).max(4000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit("documents.explain", session.user.id, 40, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = explainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const document = await prisma.generatedDocument.findUnique({ where: { id } });
  if (!document || document.userId !== session.user.id) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const languageInstruction =
    document.language === "NP"
      ? "Explain in plain, everyday Nepali (नेपाली)."
      : document.language === "BILINGUAL"
        ? "Explain first in plain English, then in plain Nepali."
        : "Explain in plain English.";

  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 500,
      system:
        "You explain legal clauses in plain, non-technical language for a layperson in Nepal. " +
        "Be concise (3-5 sentences). Do not give legal advice or tell the user whether to sign — " +
        "only explain what the clause means and what obligation or risk it creates.",
      messages: [
        {
          role: "user",
          content: `${languageInstruction}\n\nClause:\n"""\n${parsed.data.text}\n"""`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const explanation = textBlock && textBlock.type === "text" ? textBlock.text : "";

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("AI explanation failed", error);
    return NextResponse.json(
      { error: "Could not generate an explanation right now." },
      { status: 502 }
    );
  }
}
