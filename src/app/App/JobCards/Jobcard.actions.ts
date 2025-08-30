"use server";

import { getAccount } from "@/app/Auth/auth.actions";
import { z } from "zod";
import { JobCardSchema } from "./form-store";
import prisma from "@/lib/prisma";

export async function getJobCards() {
  try {
    const jobCards = await prisma.jobCard.findMany({});
    return jobCards;
  } catch (error) {
    throw new Error("Failed to fetch job cards");
  }
}

export async function deleteJobCard(id: number) {
  const account = await getAccount();
  if (!account) throw new Error("Unauthorized: No account found");
  if (!account.role.includes("Admin"))
    throw new Error("Unauthorized: Insufficient role");
  try {
    const deletedJobCard = await prisma.jobCard.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    throw new Error("Failed to delete job card");
  }
}

export async function createJobCard(jobCard: z.infer<typeof JobCardSchema>) {
  const account = await getAccount();
  if (!account) return { error: "Unauthorized: No account found" };
  if (jobCard && jobCard.parts) {
    try {
      const jobCardData = await prisma.jobCard.create({
        data: {
          date: jobCard.date ? new Date(jobCard.date).toISOString() : undefined,
          km: jobCard.km?.toString(),
          manufacturer: jobCard.manufacturer,
          model: jobCard.model,
          operator: jobCard.operator,
          department: jobCard.department,
          description: jobCard.description,
          type: jobCard.type,
          mechanic: jobCard.mechanic,
          vehicleNo: jobCard.vehicleNo,
          nextServiceDate: jobCard.nextServiceDate
            ? new Date(jobCard.nextServiceDate).toISOString()
            : undefined,
          nextServiceKm: jobCard.nextServiceKm?.toString(),
          totalAmount: jobCard.totalAmount,
        },
      });

      const parts = await Promise.all(
        jobCard.parts.map(async (part) => {
          return await prisma.part.create({
            data: {
              partCode: part.partCode,
              description: part.description,
              quantity: part.quantity,
              rate: part.rate,
              amount: part.amount,
              jobCardId: jobCardData.id,
            },
          });
        })
      );
      return { jobCard: jobCardData };
    } catch (error) {
      return { error: `Failed to create Job Card ` };
    }
  }
}
