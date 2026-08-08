import type { PlanTier } from "@prisma/client";

export const planSeeds: Array<{
  tier: PlanTier;
  nameEn: string;
  nameNp: string;
  descriptionEn: string;
  descriptionNp: string;
  priceNprMonthly: number;
  priceNprYearly: number;
  documentLimitPerMonth: number | null;
  watermarkFree: boolean;
  docxExport: boolean;
  eSignEnabled: boolean;
  teamSeats: number | null;
  apiAccess: boolean;
  sortOrder: number;
}> = [
  {
    tier: "FREE",
    nameEn: "Free",
    nameNp: "निःशुल्क",
    descriptionEn: "Try Legal Baba with limited watermarked documents.",
    descriptionNp: "सीमित वाटरमार्क कागजातसहित लिगल बाबा प्रयोग गरी हेर्नुहोस्।",
    priceNprMonthly: 0,
    priceNprYearly: 0,
    documentLimitPerMonth: 2,
    watermarkFree: false,
    docxExport: false,
    eSignEnabled: false,
    teamSeats: 1,
    apiAccess: false,
    sortOrder: 0,
  },
  {
    tier: "INDIVIDUAL",
    nameEn: "Individual",
    nameNp: "व्यक्तिगत",
    descriptionEn: "Unlimited documents, no watermark, DOCX export, and e-sign.",
    descriptionNp: "असीमित कागजात, वाटरमार्क रहित, DOCX निर्यात र ई-हस्ताक्षर।",
    priceNprMonthly: 799,
    priceNprYearly: 7999,
    documentLimitPerMonth: null,
    watermarkFree: true,
    docxExport: true,
    eSignEnabled: true,
    teamSeats: 1,
    apiAccess: false,
    sortOrder: 1,
  },
  {
    tier: "BUSINESS",
    nameEn: "Business",
    nameNp: "व्यापार",
    descriptionEn: "Team seats, shared templates, and priority support.",
    descriptionNp: "टिम सिट, साझा टेम्प्लेट र प्राथमिकता सहयोग।",
    priceNprMonthly: 2999,
    priceNprYearly: 29999,
    documentLimitPerMonth: null,
    watermarkFree: true,
    docxExport: true,
    eSignEnabled: true,
    teamSeats: 10,
    apiAccess: false,
    sortOrder: 2,
  },
  {
    tier: "ENTERPRISE",
    nameEn: "Enterprise",
    nameNp: "इन्टरप्राइज",
    descriptionEn: "Custom templates, API access, and dedicated onboarding.",
    descriptionNp: "अनुकूलित टेम्प्लेट, API पहुँच र समर्पित सहयोग।",
    priceNprMonthly: 0, // custom pricing — contact sales
    priceNprYearly: 0,
    documentLimitPerMonth: null,
    watermarkFree: true,
    docxExport: true,
    eSignEnabled: true,
    teamSeats: null, // unlimited
    apiAccess: true,
    sortOrder: 3,
  },
];
