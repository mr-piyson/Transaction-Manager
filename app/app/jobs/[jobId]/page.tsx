'use client';

import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { formatAmount, formatDate } from '@/lib/utils';
import { Tabs } from '@base-ui/react';
import { Briefcase, User2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useParams } from 'next/navigation';
import { useTableTheme } from '@/hooks/use-table-theme';
import { JobProgressCard } from './stage-progress';

export default function JobInstancePage({ params }: { params: { jobId: string } }) {
  const { jobId } = useParams();
  const tableTheme = useTableTheme();
  const { data: job, isLoading } = trpc.jobs.getJobById.useQuery({ id: jobId as string });

  // ag-grid Column Definitions for linked Purchases
  const purchaseColDefs = useMemo(
    () => [
      { field: 'title', headerName: 'Description', flex: 2 },
      {
        field: 'unitCost',
        headerName: 'Cost Basis',
        valueFormatter: (p: any) => formatAmount(p.value, 'BHD'),
        cellClass: 'font-mono',
      },
      { field: 'quantity', headerName: 'Qty', width: 100 },
      {
        headerName: 'Total Cost',
        valueGetter: (p: any) => Number(p.data.unitCost) * Number(p.data.quantity),
        valueFormatter: (p: any) => formatAmount(p.value, 'BHD'),
        cellClass: 'font-mono font-bold',
      },
    ],
    [],
  );

  if (isLoading)
    return <div className="p-8 animate-pulse text-muted-foreground">Syncing Job Data...</div>;
  if (!job) return <div className="p-8 text-red-500">Job record not found.</div>;

  // Calculate Job Profitability [cite: 26, 29]
  const totalRevenue = job.invoices.reduce((sum, inv) => sum + inv.total, BigInt(0));

  return (
    <div>
      {/* Navigation & Header */}
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Briefcase size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{job.title}</h1>
              <p className="text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <User2 size={16} /> {job.customer.name}
                </span>{' '}
                &middot; Created on {formatDate(job.createdAt)}
              </p>
            </div>
          </div>
          <StatusBadge status={job.status} />
        </div>
      </div>

      <JobProgressCard currentStatus={job.status} />

      <div className="grid grid-cols-1 "></div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: any = {
    NOT_STARTED: 'bg-slate-100 text-slate-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
  };
  return (
    <span
      className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase ${map[status]}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
