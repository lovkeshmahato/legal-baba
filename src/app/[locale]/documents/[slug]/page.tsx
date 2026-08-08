import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { parseTemplateFieldSchema } from "@/lib/template-engine";
import { pickLocalized } from "@/lib/i18n-content";
import { WizardStoreProvider } from "@/components/wizard/wizard-context";
import { WizardPageClient } from "@/components/wizard/wizard-page-client";

export default async function DocumentWizardPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  const session = await getCurrentSession();
  if (!session?.user) {
    redirect({ href: "/login", locale });
  }

  const template = await prisma.documentTemplate.findUnique({
    where: { slug, active: true },
  });
  if (!template) notFound();

  const fields = parseTemplateFieldSchema(template.fieldSchema);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold">
        {pickLocalized(template.titleEn, template.titleNp, locale)}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {pickLocalized(template.descriptionEn ?? "", template.descriptionNp ?? "", locale)}
      </p>

      <WizardStoreProvider>
        <WizardPageClient fields={fields} locale={locale} templateSlug={template.slug} />
      </WizardStoreProvider>
    </main>
  );
}
