"use server";
import { getAccount } from "@/app/Auth/auth.actions";
import prisma from "@/lib/prisma";

export const getSettings = async () => {
  try {
    if ((await getAccount())?.role !== "Admin") {
      return {
        success: false,
        data: null,
        error: "Unauthorized",
      };
    }
    const settings = await prisma.settings.findMany({});
    return { success: true, data: settings, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: "Failed to fetch settings",
    };
  }
};

export const updateSettings = async (data: any[]) => {
  try {
    if ((await getAccount())?.role !== "Admin") {
      return {
        success: false,
        data: null,
        error: "Unauthorized",
      };
    }

    const updatePromises = data.map((item) =>
      prisma.settings.updateMany({
        where: { name: item.name },
        data: { value: item.value },
      })
    );

    await Promise.all(updatePromises);

    return { success: true, data: null, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: "Failed to update settings",
    };
  }
};
