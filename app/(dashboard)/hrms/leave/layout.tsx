'use client';

import { CalendarCheck, CalendarDays, Calculator, Sun } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/App-Header';

const tabs = [
  { href: '/hrms/leave', label: 'Requests', icon: CalendarCheck },
  { href: '/hrms/leave/types', label: 'Types', icon: CalendarDays },
  { href: '/hrms/leave/balances', label: 'Balances', icon: Calculator },
  { href: '/hrms/leave/holidays', label: 'Holidays', icon: Sun },
];

export default function LeaveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentTab = tabs.find((t) => pathname === t.href || (t.href !== '/hrms/leave' && pathname.startsWith(t.href)))?.href ?? '/hrms/leave';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="Leave Management" icon={<CalendarDays className="size-5" />} />
      <div className="border-b px-4 lg:px-8">
        <div className="flex items-center gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  currentTab === tab.href
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8">
        {children}
      </div>
    </div>
  );
}
