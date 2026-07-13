'use client';

import {
  Banknote,
  CheckCircle,
  FileText,
  History,
  Pencil,
  RotateCcw,
  Send,
  ThumbsDown,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogEntry {
  id: string;
  action: string;
  diff?: Record<string, { before: unknown; after: unknown }> | null;
  createdAt: string | Date;
  user?: { id: string; name: string } | null;
}

interface PaymentEntry {
  id: string;
  amount: number;
  method: string;
  date: string | Date;
  reference?: string | null;
  notes?: string | null;
}

interface CreditNoteEntry {
  id: string;
  serial: string;
  status: string;
  total: number;
}

interface InvoiceHistoryPanelProps {
  invoice: any;
  formatDate: (date: string | Date) => string;
  formatDateTime: (date: string | Date) => string;
  onNavigate?: (path: string) => void;
}

// ---------------------------------------------------------------------------
// Timeline event construction
// ---------------------------------------------------------------------------

type TimelineEvent = {
  id: string;
  type:
    | 'created'
    | 'status_change'
    | 'sent'
    | 'payment'
    | 'credit_note'
    | 'cancelled'
    | 'update'
    | 'other';
  label: string;
  detail?: string;
  timestamp: string | Date;
  user?: string | null;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  badge?: { label: string; variant?: 'default' | 'outline' | 'destructive' };
  navigateTo?: string;
};

function buildTimelineEvents(invoice: any): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const log of invoice.auditLogs ?? []) {
    const timestamp = log.createdAt;
    const userName = log.user?.name ?? null;

    if (log.action === 'CREATE') {
      events.push({
        id: `audit-${log.id}`,
        type: 'created',
        label: 'Invoice created',
        timestamp,
        user: userName,
        icon: FileText,
        iconColor: 'text-green-600 bg-green-100 dark:bg-green-900/30',
      });
    } else if (log.action === 'STATUS_CHANGE' && log.diff) {
      const statusDiff = log.diff.status as { before?: string; after?: string } | undefined;
      const reasonDiff = log.diff.reason as { before?: unknown; after?: string } | undefined;
      const afterStatus = statusDiff?.after ?? '';
      const beforeStatus = statusDiff?.before ?? '';
      const reason = reasonDiff?.after ?? '';

      let eventType: TimelineEvent['type'] = 'status_change';
      let icon: React.ComponentType<{ className?: string }> = Send;
      let iconColor = 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';

      if (afterStatus === 'SENT') {
        icon = Send;
        iconColor = 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      } else if (afterStatus === 'APPROVED') {
        icon = CheckCircle;
        iconColor = 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      } else if (afterStatus === 'PENDING_APPROVAL') {
        icon = Send;
        iconColor = 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      } else if (afterStatus === 'CANCELLED') {
        icon = XCircle;
        iconColor = 'text-red-600 bg-red-100 dark:bg-red-900/30';
        eventType = 'cancelled';
      } else if (beforeStatus === 'PENDING_APPROVAL' && afterStatus === 'DRAFT') {
        icon = ThumbsDown;
        iconColor = 'text-red-600 bg-red-100 dark:bg-red-900/30';
      }

      const label =
        afterStatus === 'CANCELLED'
          ? 'Invoice cancelled'
          : beforeStatus === 'PENDING_APPROVAL' && afterStatus === 'DRAFT'
            ? 'Invoice rejected'
            : `${beforeStatus.replace(/_/g, ' ').toLowerCase()} → ${afterStatus.replace(/_/g, ' ').toLowerCase()}`;

      events.push({
        id: `audit-${log.id}`,
        type: eventType,
        label,
        detail: reason ? `Reason: ${reason}` : undefined,
        timestamp,
        user: userName,
        icon,
        iconColor,
      });
    } else if (log.action === 'UPDATE') {
      events.push({
        id: `audit-${log.id}`,
        type: 'update',
        label: 'Invoice updated',
        detail: log.diff ? Object.keys(log.diff).join(', ') : undefined,
        timestamp,
        user: userName,
        icon: Pencil,
        iconColor: 'text-gray-600 bg-gray-100 dark:bg-gray-800/30',
      });
    } else if (log.action === 'PAYMENT') {
      const amountDiff = log.diff?.amount as { before?: unknown; after?: unknown } | undefined;
      const amount = amountDiff?.after ?? '';
      events.push({
        id: `audit-${log.id}`,
        type: 'payment',
        label: 'Payment recorded',
        detail: amount ? `Amount: ${Number(amount).toFixed(3)}` : undefined,
        timestamp,
        user: userName,
        icon: Banknote,
        iconColor: 'text-green-600 bg-green-100 dark:bg-green-900/30',
      });
    } else if (log.action === 'DELETE') {
      const amountDiff = log.diff?.amount as { before?: unknown; after?: unknown } | undefined;
      const methodDiff = log.diff?.method as { before?: unknown; after?: unknown } | undefined;
      const amount = amountDiff?.before ?? '';
      const method = methodDiff?.before ?? '';
      events.push({
        id: `audit-${log.id}`,
        type: 'other',
        label: 'Payment removed',
        detail: amount ? `Amount: ${Number(amount).toFixed(3)}${method ? ` (${method})` : ''}` : undefined,
        timestamp,
        user: userName,
        icon: Trash2,
        iconColor: 'text-red-600 bg-red-100 dark:bg-red-900/30',
      });
    }
  }

  // --- Payments (from payments relation) ---
  for (const payment of invoice.payments ?? []) {
    events.push({
      id: `payment-${payment.id}`,
      type: 'payment',
      label: `Payment received — ${Number(payment.amount).toFixed(3)}`,
      detail: payment.reference ? `Ref: ${payment.reference}` : undefined,
      timestamp: payment.date,
      icon: Banknote,
      iconColor: 'text-green-600 bg-green-100 dark:bg-green-900/30',
      badge: { label: payment.method, variant: 'outline' },
    });
  }

  // --- Credit notes ---
  for (const cn of invoice.creditNotes ?? []) {
    events.push({
      id: `cn-${cn.id}`,
      type: 'credit_note',
      label: `Credit note ${cn.serial} issued`,
      detail: `Amount: ${Number(cn.total).toFixed(3)}`,
      timestamp: cn.date ?? cn.createdAt ?? invoice.createdAt,
      icon: RotateCcw,
      iconColor: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
      badge: {
        label: cn.status,
        variant: cn.status === 'SENT' ? 'outline' : 'default',
      },
      navigateTo: `/erp/documents/invoices/${cn.id}`,
    });
  }

  // Sort by timestamp ascending
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return events;
}

// ---------------------------------------------------------------------------
// Group events by date
// ---------------------------------------------------------------------------

function groupByDate(events: TimelineEvent[], formatDate: (d: string | Date) => string) {
  const groups: { date: string; events: TimelineEvent[] }[] = [];
  const map = new Map<string, TimelineEvent[]>();

  for (const event of events) {
    const dateKey = formatDate(event.timestamp);
    if (!map.has(dateKey)) {
      map.set(dateKey, []);
    }
    map.get(dateKey)!.push(event);
  }

  for (const [date, evts] of map) {
    groups.push({ date, events: evts });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function InvoiceHistoryPanel({
  invoice,
  formatDate,
  formatDateTime,
  onNavigate,
}: InvoiceHistoryPanelProps) {
  const t = useTranslations();

  const events = React.useMemo(() => buildTimelineEvents(invoice), [invoice]);
  const groups = React.useMemo(() => groupByDate(events, formatDate), [events, formatDate]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <History className="size-4" />
          {t('invoices.history')}
        </h3>
        <Badge variant="outline" className="text-xs">
          {events.length}
        </Badge>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('invoices.noHistory')}
          </p>
        )}
        {groups.map((group, gi) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="relative flex items-center py-2">
              <div className="flex-1 border-t border-border" />
              <span className="px-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {group.date}
              </span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Events */}
            {group.events.map((event, ei) => {
              const Icon = event.icon;
              const isLast = gi === groups.length - 1 && ei === group.events.length - 1;

              return (
                <div key={event.id} className="relative flex gap-3 pb-3">
                  {/* Timeline line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`size-7 rounded-full flex items-center justify-center shrink-0 ${event.iconColor}`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>

                  {/* Card */}
                  <Card className="flex-1 min-w-0 py-2.5 px-3">
                    <CardContent className="p-0 space-y-1">
                      <p className="text-sm font-medium leading-tight">{event.label}</p>

                      {event.detail && (
                        <p className="text-xs text-muted-foreground">{event.detail}</p>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {event.user && (
                            <>
                              <User className="size-3" />
                              <span>{event.user}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {event.badge && (
                            <Badge variant={event.badge.variant ?? 'outline'} className="text-[10px]">
                              {event.badge.label}
                            </Badge>
                          )}
                          {event.navigateTo && onNavigate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1.5 text-[10px]"
                              onClick={() => onNavigate(event.navigateTo!)}
                            >
                              →
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="text-[10px] text-muted-foreground">
                        {formatDateTime(event.timestamp)}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
