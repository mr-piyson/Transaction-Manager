'use client';

import { Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/App-Header';
import { Button } from '@/components/ui/button';
import { useShiftForm } from '@/components/dialogs';

export default function ShiftsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { openCreate } = useShiftForm();
  const currentTab = pathname.includes('/shifts/assignments') ? 'assignments' : 'shifts';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="Shifts" icon={<Clock className="size-5" />} />
      <div className="border-b px-4 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/hrms/shifts"
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'shifts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="size-4" />
              Shifts
            </Link>
            <Link
              href="/hrms/shifts/assignments"
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'assignments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="size-4" />
              Assignments
            </Link>
          </div>
          <Button size="sm" onClick={() => openCreate()}>
            Create Shift
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8">
        {children}
      </div>
    </div>
  );
}
