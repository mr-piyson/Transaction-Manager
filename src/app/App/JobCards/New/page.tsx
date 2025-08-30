"use client";
import { JobCardFormProvider } from "../form-store";
import { JobCardForm } from "../Job-Card-Form";

export default function NewJobCard(props: any) {
  return (
    <JobCardFormProvider>
      <JobCardForm editable={true} />
    </JobCardFormProvider>
  );
}
