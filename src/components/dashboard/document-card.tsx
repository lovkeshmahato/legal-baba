"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface DocumentCardData {
  id: string;
  title: string;
  status: "DRAFT" | "GENERATED" | "FINALIZED" | "ARCHIVED";
  language: string;
  version: number;
  updatedAt: string;
  tags: string[];
  shareToken: string | null;
}

export function DocumentCard({ document, locale }: { document: DocumentCardData; locale: string }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [doc, setDoc] = useState(document);
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tagInput, setTagInput] = useState("");

  // Built client-side only (needs window.location), so it can't run during SSR.
  useEffect(() => {
    if (document.shareToken) {
      setShareUrl(`${window.location.origin}/${locale}/share/${document.shareToken}`);
    }
  }, [document.shareToken, locale]);

  async function onContinue() {
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/generate`, { method: "POST" });
      if (res.ok) {
        router.push(`/documents/review/${doc.id}`);
        return;
      }
    } finally {
      setBusy(false);
    }
  }

  async function onShare() {
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/share`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setShareUrl(`${window.location.origin}/${locale}/share/${data.shareToken}`);
    } finally {
      setBusy(false);
    }
  }

  async function onUnshare() {
    setBusy(true);
    try {
      await fetch(`/api/documents/${doc.id}/share`, { method: "DELETE" });
      setShareUrl(null);
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function onArchive() {
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function addTag() {
    const tag = tagInput.trim();
    if (!tag || doc.tags.includes(tag)) return;
    const nextTags = [...doc.tags, tag];
    setDoc({ ...doc, tags: nextTags });
    setTagInput("");
    await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: nextTags }),
    });
  }

  async function removeTag(tag: string) {
    const nextTags = doc.tags.filter((t) => t !== tag);
    setDoc({ ...doc, tags: nextTags });
    await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: nextTags }),
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{doc.title}</CardTitle>
          <Badge variant={doc.status === "DRAFT" ? "secondary" : "default"}>
            {doc.status === "DRAFT" ? t("drafts") : t("finalized")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {doc.language} · v{doc.version} · {new Date(doc.updatedAt).toLocaleDateString(locale)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {doc.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="cursor-pointer" onClick={() => removeTag(tag)}>
              {tag} ×
            </Badge>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder={locale === "np" ? "ट्याग थप्नुहोस्" : "Add a tag"}
            className="h-8 text-xs"
          />
          <Button size="sm" variant="outline" onClick={addTag}>
            +
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {doc.status === "DRAFT" ? (
            <Button size="sm" onClick={onContinue} disabled={busy}>
              {locale === "np" ? "पुनः प्रयास गर्नुहोस्" : "Retry generation"}
            </Button>
          ) : (
            <>
              <Button asChild size="sm">
                <a href={`/${locale}/documents/review/${doc.id}`}>{locale === "np" ? "खोल्नुहोस्" : "Open"}</a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`/api/documents/${doc.id}/pdf?locale=${locale}`} target="_blank" rel="noreferrer">
                  PDF
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`/api/documents/${doc.id}/docx?locale=${locale}`}>DOCX</a>
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={onArchive} disabled={busy}>
            {locale === "np" ? "अभिलेख" : "Archive"}
          </Button>
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-3">
          {shareUrl ? (
            <>
              <Button size="sm" variant="outline" onClick={onCopy}>
                {copied ? (locale === "np" ? "प्रतिलिपि भयो" : "Copied") : locale === "np" ? "लिङ्क प्रतिलिपि" : "Copy link"}
              </Button>
              <Button size="sm" variant="ghost" onClick={onUnshare} disabled={busy}>
                {locale === "np" ? "साझा हटाउनुहोस्" : "Unshare"}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={onShare} disabled={busy}>
              {locale === "np" ? "साझा गर्नुहोस्" : "Share view-only link"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
