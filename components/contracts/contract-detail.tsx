import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { differenceInDays } from 'date-fns';
import { useDateFormat } from '@/hooks/use-date-format';
import { ContractStatusBadge } from './contract-status-badge';

interface ContractDetailProps {
  contract: any;
}

export function ContractDetail({ contract }: ContractDetailProps) {
  const t = useTranslations();
  const { formatDate, formatDateTime } = useDateFormat();

  const totalDays = differenceInDays(new Date(contract.endDate), new Date(contract.startDate));
  const daysRemaining = differenceInDays(new Date(contract.endDate), new Date());
  const progressPct = totalDays > 0 ? Math.max(0, Math.min(100, ((totalDays - Math.max(0, daysRemaining)) / totalDays) * 100)) : 0;
  const daysUntilRenewal = contract.renewalDate
    ? differenceInDays(new Date(contract.renewalDate), new Date())
    : null;
  const isExpiringSoon = contract.status === 'ACTIVE' && daysRemaining >= 0 && daysRemaining <= (contract.renewalAlertDays ?? 30);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">{t('contracts.customer')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{contract.customer?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{contract.customer?.email ?? ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">{t('contracts.contractValue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{Number(contract.contractValue ?? 0).toFixed(3)} {contract.currency}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">{t('contracts.dateRange')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">
              {contract.startDate ? formatDate(contract.startDate) : '—'}
              {' → '}
              {contract.endDate ? formatDate(contract.endDate) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {daysRemaining >= 0
                ? t('contracts.daysRemaining', { days: daysRemaining })
                : t('contracts.expired')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">{t('contracts.renewalInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            {contract.renewalDate ? (
              <>
                <p className="font-semibold">{formatDate(contract.renewalDate)}</p>
                {daysUntilRenewal !== null && daysUntilRenewal >= 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('contracts.renewalIn', { days: daysUntilRenewal })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t('contracts.progress')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isExpiringSoon ? 'bg-yellow-500' : daysRemaining < 0 ? 'bg-red-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(progressPct, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium shrink-0">
              {progressPct.toFixed(0)}%
            </span>
          </div>
          {isExpiringSoon && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              ⚠️ {t('contracts.expiringSoon')} ({daysRemaining} {t('contracts.days')})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {contract.description && (
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">{t('contracts.description')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{contract.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {contract.notes && (
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs text-muted-foreground font-medium">{t('contracts.notes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{contract.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Meta info */}
      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pb-2">
        <span>
          {t('common.created')} {contract.createdAt ? formatDateTime(contract.createdAt) : '—'}
          {contract.createdBy ? ` by ${contract.createdBy.name}` : ''}
        </span>
        <span>
          {t('common.updated')} {contract.updatedAt ? formatDateTime(contract.updatedAt) : '—'}
          {contract.updatedBy ? ` by ${contract.updatedBy.name}` : ''}
        </span>
      </div>
    </div>
  );
}
