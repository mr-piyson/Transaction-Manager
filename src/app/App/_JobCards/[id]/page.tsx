"use server";
import { redirect } from "next/navigation";
import { JobCardForm } from "../Job-Card-Form";
import { JobCardFormProvider } from "../form-store";
import prisma from "@/lib/prisma";

export default async function JobCardPreview(props: any) {
  const id = (await props.params).id;

  const jobCard = await prisma.jobCard.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      Part: true,
    },
  });

  if (!jobCard) {
    redirect("/App/JobCards");
  }
  return (
    <JobCardFormProvider>
      <JobCardForm editable={false} jobCard={jobCard} />
    </JobCardFormProvider>
  );
}
