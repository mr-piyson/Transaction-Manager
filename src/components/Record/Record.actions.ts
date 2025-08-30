"use server";

import prisma from "@/lib/prisma";
import { getAccount } from "@/app/Auth/auth.actions";

export async function getRecords() {
  const account = await getAccount();
  return account ? await prisma.record.findMany({}) : undefined;
}
