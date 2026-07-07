'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc/client';

export default function ResetPage() {
  const router = useRouter();
  const resetMutation = trpc.setup.reset.useMutation();
  const [confirmation, setConfirmation] = useState('');
  const isConfirmed = confirmation === 'RESET';

  const handleReset = async () => {
    if (!isConfirmed) return;
    try {
      await resetMutation.mutateAsync({ confirmation: 'RESET' });
      toast.success('All data has been wiped. Redirecting to setup...');
      router.push('/setup');
    } catch (error: any) {
      toast.error(error.message ?? 'Reset failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-destructive/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl text-destructive">Reset Everything</CardTitle>
            <p className="text-sm text-muted-foreground">
              This will permanently delete ALL data including organizations, users,
              invoices, and all records across the entire system. System permissions
              and roles will be re-seeded automatically.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
              <p className="text-sm font-medium text-destructive">
                This action cannot be undone. Make sure you have a backup before proceeding.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Type <span className="font-mono font-bold">RESET</span> to confirm
              </Label>
              <Input
                id="confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Type RESET to confirm"
                className="font-mono"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-4">
            <Button variant="outline" onClick={() => router.push('/')}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={!isConfirmed || resetMutation.isPending}
            >
              {resetMutation.isPending ? 'Resetting...' : 'Reset Everything'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
