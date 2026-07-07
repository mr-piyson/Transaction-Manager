'use client';

import { Briefcase, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/App-Header';
import { Button } from '@/components/ui/button';
import { useJobPostingForm } from '@/components/dialogs';

export default function RecruitmentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { openCreate } = useJobPostingForm();
  const currentTab = pathname.includes('/recruitment/candidates') ? 'candidates' : 'postings';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="Recruitment" icon={<Briefcase className="size-5" />} />
      <div className="border-b px-4 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/hrms/recruitment"
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'postings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Briefcase className="size-4" />
              Job Postings
            </Link>
            <Link
              href="/hrms/recruitment/candidates"
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'candidates'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="size-4" />
              Candidates
            </Link>
          </div>
          <Button size="sm" onClick={() => openCreate()}>
            Create Job Posting
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-8">
        {children}
      </div>
    </div>
  );
}
