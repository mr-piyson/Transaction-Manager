'use client';

import { MoreHorizontal, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

const typeBadge: Record<string, string> = {
  WARNING: 'bg-yellow-100 text-yellow-800',
  SUSPENSION: 'bg-orange-100 text-orange-800',
  TERMINATION: 'bg-red-100 text-red-800',
  WRITTEN_REPRIMAND: 'bg-blue-100 text-blue-800',
  VERBAL_WARNING: 'bg-gray-100 text-gray-800',
};

export default function DisciplinaryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const limit = 25;

  const { data, isLoading, refetch } = trpc.hr.employeeRelations.disciplinaryActions.list.useQuery({
    page,
    limit,
    search: search || undefined,
    employeeId: employeeId || undefined,
    type: typeFilter === 'all' ? undefined : typeFilter as 'VERBAL_WARNING' | 'WRITTEN_WARNING' | 'SUSPENSION' | 'TERMINATION',
  });

  const deleteMutation = trpc.hr.employeeRelations.disciplinaryActions.delete.useMutation({
    onSuccess: () => { refetch(); toast.success('Disciplinary action deleted'); },
    onError: (e) => toast.error(e.message),
  });

  const actions = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="VERBAL_WARNING">Verbal Warning</SelectItem>
            <SelectItem value="WRITTEN_REPRIMAND">Written Reprimand</SelectItem>
            <SelectItem value="WARNING">Warning</SelectItem>
            <SelectItem value="SUSPENSION">Suspension</SelectItem>
            <SelectItem value="TERMINATION">Termination</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : actions.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><ShieldAlert className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No disciplinary actions</EmptyTitle>
              <EmptyDescription>No disciplinary actions found for the selected filters.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Issued By</TableHead>
                    <TableHead>Issued At</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{a.employee?.user?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{a.employee?.employeeCode}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeBadge[a.type] ?? ''}>
                          {a.type?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate">{a.reason ?? '—'}</TableCell>
                      <TableCell className="text-sm">{a.issuedBy?.user?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {a.issuedAt ? format(new Date(a.issuedAt), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="size-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm('Delete this disciplinary action?')) deleteMutation.mutate({ id: a.id });
                              }}
                            >
                              <Trash2 className="size-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                <PaginationItem className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
