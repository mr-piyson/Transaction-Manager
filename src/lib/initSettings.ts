// lib/initSettings.ts
import prisma from "@/lib/prisma";

const settingNames = [
  "companyName",
  "companyAddress",
  "companyPhone",
  "companyEmail",
  "companyLogo",
  "companyWebsite",
  "companyTaxId",
  "companyRegistrationNumber",
  "companyBankAccount",
  "companyCurrency",
  "SecretKey",
] as const;

type SettingName = (typeof settingNames)[number];

export type Settings = {
  name: SettingName;
  value: string;
};

const defaultSettings: Settings[] = settingNames.map((name) =>
  name === "SecretKey"
    ? {
        name,
        value: process.env.SECRET_KEY || "",
      }
    : {
        name,
        value: "",
      }
);

export async function initializeSettings() {
  // Remove settings not included in settingNames
  await prisma.settings.deleteMany({
    where: {
      name: {
        notIn: Array.from(settingNames),
      },
    },
  });

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { name: setting.name },
      update: {}, // Prevent any updates
      create: setting,
    });
  }
}
