'use client';

import { ArrowLeft, Ban, Edit, Handshake, MoreHorizontal, Play, Trash, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { UniversalDropdownMenu } from '@/components/dropdown';
import { useContractForm } from '@/components/dialogs';
import { ContractDetail } from '@/components/contracts/contract-detail';
import { ContractStatusBadge } from '@/components/contracts/contract-status-badge';
import { trpc } from '@/lib/trpc/client';

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = useContractForm();
  const t = useTranslations();

  const { data: contract, isLoading, isError, error, refetch } = trpc.contracts.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const activateMutation = trpc.contracts.activate.useMutation({
    onSuccess: () => {
      utils.contracts.byId.invalidate({ id: params.id });
      utils.contracts.list.invalidate();
      toast.success(t('contracts.contractActivated'));
    },
    onError: (e) => toast.error(e.message),
  });

  const terminateMutation = trpc.contracts.terminate.useMutation({
    onSuccess: () => {
      utils.contracts.byId.invalidate({ id: params.id });
      utils.contracts.list.invalidate();
      toast.success(t('contracts.contractTerminated'));
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.contracts.delete.useMutation({
    onSuccess: () => {
      utils.contracts.list.invalidate();
      toast.success(t('contracts.contractDeleted'));
      router.push('/erp/contracts');
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = activateMutation.isPending || terminateMutation.isPending || deleteMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Handshake className="size-6" />
            </EmptyMedia>
            <EmptyTitle>{isError ? t('common.failedToLoad') : t('common.notFound')}</EmptyTitle>
            <EmptyDescription>
              {error?.message ?? t('contracts.doesNotExist')}
            </EmptyDescription>
          </EmptyHeader>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/erp/contracts')}>
              <ArrowLeft className="size-4 mr-1" /> {t('common.back')}
            </Button>
            {isError && <Button onClick={() => refetch()}>{t('common.retry')}</Button>}
          </div>
        </Empty>
      </div>
    );
  }

  const handleEdit = () => {
    openEdit(
      {
        id: contract.id,
        title: contract.title,
        description: contract.description ?? undefined,
        status: contract.status,
        contractValue: Number(contract.contractValue),
        currency: contract.currency,
        startDate: contract.startDate ? new Date(contract.startDate).toISOString().split('T')[0] : '',
        endDate: contract.endDate ? new Date(contract.endDate).toISOString().split('T')[0] : '',
        renewalDate: contract.renewalDate ? new Date(contract.renewalDate).toISOString().split('T')[0] : undefined,
        renewalAlertDays: contract.renewalAlertDays,
        notes: contract.notes ?? undefined,
        customerId: contract.customerId ?? undefined,
      },
      { onSuccess: () => utils.contracts.byId.invalidate({ id: contract.id }) },
    );
  };

  const handleActivate = () => {
    alert.confirm({
      title: t('contracts.activateConfirm'),
      description: t('contracts.activateDescription'),
      confirmText: t('contracts.activate'),
      onConfirm: async () => {
        await activateMutation.mutateAsync({ id: contract.id });
      },
    });
  };

  const handleTerminate = () => {
    alert.delete({
      title: t('contracts.terminateConfirm'),
      description: t('contracts.terminateDescription'),
      confirmText: t('contracts.terminate'),
      onConfirm: async () => {
        await terminateMutation.mutateAsync({ id: contract.id });
      },
    });
  };

  const handleDelete = () => {
    alert.delete({
      title: t('common.confirmDelete'),
      description: t('contracts.deleteConfirm'),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ id: contract.id });
      },
    });
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex h-14 items-center gap-2 px-2 border-b bg-background/95 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/erp/contracts')}>
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Handshake className="size-5 text-muted-foreground shrink-0" />
          <h1 className="text-xl font-semibold truncate">{contract.serial}</h1>
          <ContractStatusBadge status={contract.status} />
        </div>
        <div className="flex items-center gap-2">
          <UniversalDropdownMenu
            trigger={<MoreHorizontal className="size-4" />}
            items={[
              ...(contract.status === 'DRAFT'
                ? [{
                    id: 'activate' as const,
                    label: t('contracts.activate'),
                    icon: Play,
                    disabled: isPending,
                    onClick: handleActivate,
                  }]
                : []),
              { id: 'edit', label: t('common.edit'), icon: Edit, onClick: handleEdit },
              ...(contract.status === 'ACTIVE' || contract.status === 'DRAFT'
                ? [{
                    id: 'terminate' as const,
                    label: t('contracts.terminate'),
                    icon: Ban,
                    destructive: true as const,
                    disabled: isPending,
                    onClick: handleTerminate,
                  }]
                : []),
              ...(contract.status !== 'ACTIVE'
                ? [{
                    id: 'delete' as const,
                    label: t('common.delete'),
                    icon: Trash,
                    destructive: true as const,
                    disabled: isPending,
                    onClick: handleDelete,
                  }]
                : []),
            ]}
          />
        </div>
      </header>

      <ContractDetail contract={contract} />
    </div>
  );
}
