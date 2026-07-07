'use client';

import { Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/App-Header';
import { Button } from '@/components/ui/button';
import { useTimePunchForm } from '@/components/dialogs';

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { openCreate } = useTimePunchForm();
  const currentTab = pathname.endsWith('/time-punches') ? 'time-punches' : 'records';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="Attendance" icon={<Calendar className="size-5" />} />
      <div className="border-b px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/hrms/attendance"
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'records'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="size-4" />
            Records
          </Link>
          <Link
            href="/hrms/attendance/time-punches"
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'time-punches'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="size-4" />
            Time Punches
          </Link>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8">
        {children}
      </div>
    </div>
  );
}
