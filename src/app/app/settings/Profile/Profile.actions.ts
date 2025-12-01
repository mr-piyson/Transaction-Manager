"use server";
import db from "@/lib/db";

export const getSettings = async () => {
  try {
    const settings = await db.settings.findMany({});
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
    const updatePromises = data.map((item) =>
      db.settings.updateMany({
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
