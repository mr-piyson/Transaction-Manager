"use server";

import { Account } from "@prisma/client";
import { SignInSchema } from "./Account-Dialog";
import { z } from "zod";
import * as bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

export async function getAccounts(): Promise<Account[]> {
  const account = await prisma.account.findMany({});
  return account;
}

export async function getAccountByEmail(
  email: string
): Promise<Account | null> {
  const account = await prisma.account.findUnique({
    where: { email: email },
  });
  return account;
}

export async function createAccount(data: z.infer<typeof SignInSchema>) {
  const account = await getAccountByEmail(data.email);
  if (account) {
    return { error: "Account already exists" };
  }

  const saltRounds = 10;

  const hashedPassword = await bcrypt.hash(data.password, saltRounds);

  const newAccount = await prisma.account.create({
    data: {
      name: data.name,
      email: data.email,
      image: data.image,
      password: hashedPassword,
      role: data.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return newAccount;
}

export async function updateAccount(
  id: string,
  data: Partial<z.infer<typeof SignInSchema>>
) {
  const account = await prisma.account.update({
    where: { id: id },
    data: {
      name: data.name,
      email: data.email,
      image: data.image,
      password: data.password,
      role: data.role,
      updatedAt: new Date(),
    },
  });
  return account;
}

export async function deleteAccount(id: string) {
  const account = await prisma.account.delete({
    where: { id: id },
  });
  return account;
}
