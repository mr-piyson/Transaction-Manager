'use client';

import { MessageSquare, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/App-Header';
import { Button } from '@/components/ui/button';
import { useGrievanceForm } from '@/components/dialogs';

export default function EmployeeRelationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { openCreate } = useGrievanceForm();
  const currentTab = pathname.includes('/employee-relations/disciplinary') ? 'disciplinary' : 'grievances';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="Employee Relations" icon={<MessageSquare className="size-5" />} />
      <div className="border-b px-4 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/hrms/employee-relations"
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'grievances'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="size-4" />
              Grievances
            </Link>
            <Link
              href="/hrms/employee-relations/disciplinary"
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'disciplinary'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <ShieldAlert className="size-4" />
              Disciplinary
            </Link>
          </div>
          <Button size="sm" onClick={() => openCreate()}>
            Create Grievance
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8">
        {children}
      </div>
    </div>
  );
}
