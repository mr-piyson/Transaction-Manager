'use client';

import { User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useEmployeeForm } from '@/components/dialogs';

export default function EmployeesPage() {
  const router = useRouter();
  const t = useTranslations();
  const { openCreate } = useEmployeeForm();

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
        <User className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Employees</h2>
        <p className="text-muted-foreground mt-1">Select an employee from the list to view their details</p>
      </div>
      <Button onClick={() => openCreate()}>Create Employee</Button>
    </div>
  );
}
