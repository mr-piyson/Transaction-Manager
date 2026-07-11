'use client';

import { Edit, ExternalLink, FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
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
import { Header } from '@/components/layout/App-Header';
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
import { useDocumentForm } from '@/components/dialogs';
import { trpc } from '@/lib/trpc/client';
import { useDateFormat } from '@/hooks/use-date-format';

export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { openCreate } = useDocumentForm();
  const limit = 25;
  const { formatDate } = useDateFormat();

  const { data: employeesData } = trpc.hr.employees.list.useQuery({});

  const { data, isLoading, refetch } = trpc.hr.documents.list.useQuery({
    page,
    limit,
    search: search || undefined,
    employeeId: employeeFilter || undefined,
    type: typeFilter || undefined,
  });

  const deleteMutation = trpc.hr.documents.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Document deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  const records = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const total = (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];

  const documentTypes = [...new Set(records.map((r: any) => r.type).filter(Boolean))];

  const handleDelete = (doc: any) => {
    alert.delete({
      title: 'Delete Document',
      description: `Are you sure you want to delete "${doc.name}"?`,
      confirmText: 'Delete',
      onConfirm: () => { deleteMutation.mutate({ id: doc.id }) },
    });
  };

  return (
    <div className="space-y-6">
      <Header
        title="Documents"
        description="Manage employee documents"
        actions={
          <Button onClick={() => openCreate()}>
            <Plus className="size-4 mr-2" />
            Add Document
          </Button>
        }
      />

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select
          value={employeeFilter}
          onValueChange={(v) => { setEmployeeFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map((emp: any) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.user?.name ?? emp.employeeCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => { setTypeFilter(v); setPage(1); }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {documentTypes.map((type: any) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Empty>
            <EmptyHeader>
              <EmptyMedia><FileText className="size-16 text-muted-foreground" /></EmptyMedia>
              <EmptyTitle>No documents</EmptyTitle>
              <EmptyDescription>No documents found for the selected filters.</EmptyDescription>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Uploaded At</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm">
                        <div>
                          <p className="font-medium">{record.employee?.user?.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{record.employee?.employeeCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{record.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <a
                          href={record.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          View
                        </a>
                      </TableCell>
                      <TableCell className="text-sm">{record.uploadedBy?.name || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {record.createdAt ? formatDate(record.createdAt) : '—'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">Actions</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDelete(record)}>
                              <Trash2 className="size-4 mr-2" />
                              Delete
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
