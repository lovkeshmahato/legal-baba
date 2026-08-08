import { PrismaClient, type Prisma } from "@prisma/client";
import { categorySeeds } from "./seed-data/categories";
import { employmentTemplates } from "./seed-data/employment";
import { rentalTemplates } from "./seed-data/rental";
import { businessTemplates } from "./seed-data/business";
import { planSeeds } from "./seed-data/plans";

const prisma = new PrismaClient();

// Round-trips through JSON so `as const` readonly seed literals satisfy
// Prisma's mutable InputJsonValue type.
function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

interface TemplateSeed {
  slug: string;
  titleEn: string;
  titleNp: string;
  descriptionEn: string;
  descriptionNp: string;
  requiresLawyerReview: boolean;
  isGovernmentFormat: boolean;
  systemPromptEn: string;
  systemPromptNp: string;
  fields: readonly unknown[];
  clauses: readonly {
    key: string;
    titleEn: string;
    titleNp: string;
    bodyEn: string;
    bodyNp: string;
    isDefault: boolean;
    isToggleable: boolean;
    sortOrder: number;
    riskFlagIfMissing?: string;
  }[];
}

const templatesByCategory: Record<string, readonly TemplateSeed[]> = {
  employment: employmentTemplates,
  "rental-property": rentalTemplates,
  "business-commercial": businessTemplates,
};

async function main() {
  console.log("Seeding plans...");
  for (const plan of planSeeds) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    });
  }

  console.log("Seeding document categories...");
  for (const category of categorySeeds) {
    const createdCategory = await prisma.documentCategory.upsert({
      where: { slug: category.slug },
      update: {
        nameEn: category.nameEn,
        nameNp: category.nameNp,
        descriptionEn: category.descriptionEn,
        descriptionNp: category.descriptionNp,
        icon: category.icon,
        sortOrder: category.sortOrder,
      },
      create: category,
    });

    const templates = templatesByCategory[category.slug] ?? [];
    if (templates.length === 0) continue;

    console.log(`  Seeding ${templates.length} template(s) for "${category.slug}"...`);
    for (const [index, template] of templates.entries()) {
      const { clauses, fields, ...templateFields } = template;

      const createdTemplate = await prisma.documentTemplate.upsert({
        where: { slug: template.slug },
        update: {
          ...templateFields,
          categoryId: createdCategory.id,
          fieldSchema: asJson(fields),
          sortOrder: index,
        },
        create: {
          ...templateFields,
          categoryId: createdCategory.id,
          fieldSchema: asJson(fields),
          sortOrder: index,
        },
      });

      for (const [clauseIndex, clause] of clauses.entries()) {
        await prisma.clauseLibraryItem.upsert({
          where: {
            templateId_key: { templateId: createdTemplate.id, key: clause.key },
          },
          update: { ...clause, sortOrder: clauseIndex, templateId: createdTemplate.id },
          create: { ...clause, sortOrder: clauseIndex, templateId: createdTemplate.id },
        });
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
