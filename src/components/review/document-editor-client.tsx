"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import type { DocumentLanguage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AiFlag } from "@/types/template-engine";

interface DocumentEditorClientProps {
  documentId: string;
  initialContent: Record<string, unknown>;
  initialFlags: AiFlag[];
  locale: string;
  language: DocumentLanguage;
}

export function DocumentEditorClient({
  documentId,
  initialContent,
  initialFlags,
  locale,
}: DocumentEditorClientProps) {
  const t = useTranslations("review");
  const [flags, setFlags] = useState(initialFlags);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    immediatelyRender: false,
  });

  async function onSave() {
    if (!editor) return;
    setSaving(true);
    try {
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editor.getJSON() }),
      });
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  async function onRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/generate`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      editor?.commands.setContent(data.content);
      setFlags(data.aiFlags ?? []);
    } finally {
      setRegenerating(false);
    }
  }

  async function onExplainSelection() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ").trim();
    if (!text) {
      setExplanation(
        locale === "np"
          ? "व्याख्या गर्न पहिले कागजातमा केही अंश छान्नुहोस्।"
          : "Select some text in the document first."
      );
      return;
    }
    setExplaining(true);
    setExplanation(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setExplanation(data.explanation ?? null);
    } finally {
      setExplaining(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {flags.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-accent/50 bg-accent/10 p-4">
          {flags.map((flag, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Badge variant="warning">{t("risk_flag")}</Badge>
              <span>{locale === "np" ? flag.message.np : flag.message.en}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "…" : t("save")}
        </Button>
        <Button size="sm" variant="outline" onClick={onRegenerate} disabled={regenerating}>
          {regenerating ? "…" : t("regenerate")}
        </Button>
        <Button size="sm" variant="outline" onClick={onExplainSelection} disabled={explaining}>
          {explaining ? "…" : t("explain_clause")}
        </Button>
        <Button size="sm" variant="ghost" disabled title="Coming in a later phase">
          {t("download_pdf")}
        </Button>
        <Button size="sm" variant="ghost" disabled title="Coming in a later phase">
          {t("download_docx")}
        </Button>
        {savedAt && <span className="text-xs text-muted-foreground">Saved</span>}
      </div>

      {explanation && (
        <Card>
          <CardContent className="pt-6 text-sm">{explanation}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="prose prose-sm max-w-none pt-6 dark:prose-invert">
          <EditorContent editor={editor} />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">{t("disclaimer")}</p>
    </div>
  );
}
