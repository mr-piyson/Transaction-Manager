'use client';

import {
  ArrowLeft,
  CheckCircle2,
  Edit,
  Loader2,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
import { alert } from '@/components/Alert-dialog';
import { usePerformanceReviewForm } from '@/components/dialogs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
  ACKNOWLEDGED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
};

export default function PerformanceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { openEdit } = usePerformanceReviewForm();

  const { data: review, isLoading, isError, refetch } = trpc.hr.performance.byId.useQuery(
    { id: params.id },
    { enabled: !!params.id },
  );

  const submitMutation = trpc.hr.performance.submit.useMutation({
    onSuccess: () => {
      utils.hr.performance.byId.invalidate({ id: params.id });
      utils.hr.performance.list.invalidate();
      toast.success('Performance review submitted');
    },
    onError: (e) => toast.error(e.message),
  });

  const acknowledgeMutation = trpc.hr.performance.acknowledge.useMutation({
    onSuccess: () => {
      utils.hr.performance.byId.invalidate({ id: params.id });
      utils.hr.performance.list.invalidate();
      toast.success('Performance review acknowledged');
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.hr.performance.delete.useMutation({
    onSuccess: () => {
      utils.hr.performance.list.invalidate();
      toast.success('Performance review deleted');
      router.push('/hrms/performance');
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending =
    submitMutation.isPending ||
    acknowledgeMutation.isPending ||
    deleteMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (isError || !review) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Empty>
          <EmptyHeader>
            <EmptyMedia><Star className="size-16" /></EmptyMedia>
            <EmptyTitle>Review not found</EmptyTitle>
            <EmptyDescription>The performance review you're looking for doesn't exist or has been deleted.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/hrms/performance')}>
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">
                  {review.employee?.user?.name}
                </h1>
                <Badge variant="outline" className={STATUS_COLORS[review.status] ?? ''}>
                  {review.status}
                </Badge>
                {review.rating != null && (
                  <Badge variant="outline" className={
                    Number(review.rating) >= 4 ? 'bg-green-100 text-green-800' :
                    Number(review.rating) >= 3 ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {review.rating}/5
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Reviewed by {review.reviewer?.name ?? '—'}
                {review.reviewPeriod && <span> · {review.reviewPeriod}</span>}
                {review.reviewDate && <span> · {format(new Date(review.reviewDate), 'dd MMM yyyy')}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {review.status === 'DRAFT' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit({ id: review.id }, { onSuccess: () => refetch() })}
                >
                  <Edit className="size-4 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => submitMutation.mutate({ id: params.id })}
                  disabled={isPending}
                >
                  {submitMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Submit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    alert.delete({
                      title: 'Delete Review',
                      description: 'Are you sure you want to delete this performance review?',
                      confirmText: 'Delete',
                      onConfirm: async () => {
                        await deleteMutation.mutateAsync({ id: params.id });
                      },
                    })
                  }
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4 mr-1" /> Delete
                </Button>
              </>
            )}
            {review.status === 'SUBMITTED' && (
              <Button
                size="sm"
                onClick={() => acknowledgeMutation.mutate({ id: params.id })}
                disabled={isPending}
              >
                {acknowledgeMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                <CheckCircle2 className="size-4 mr-1" /> Acknowledge
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comments</CardTitle>
            </CardHeader>
            <CardContent>
              {review.comments ? (
                <p className="text-sm whitespace-pre-wrap">{review.comments}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No comments provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Goals</CardTitle>
            </CardHeader>
            <CardContent>
              {review.goals ? (
                <p className="text-sm whitespace-pre-wrap">{review.goals}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No goals defined.</p>
              )}
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              {review.strengths ? (
                <p className="text-sm whitespace-pre-wrap">{review.strengths}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No strengths recorded.</p>
              )}
            </CardContent>
          </Card>

          {/* Weaknesses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weaknesses</CardTitle>
            </CardHeader>
            <CardContent>
              {review.weaknesses ? (
                <p className="text-sm whitespace-pre-wrap">{review.weaknesses}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No weaknesses recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
