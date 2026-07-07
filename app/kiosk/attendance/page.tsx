'use client';

import { Clock, Loader2, Monitor } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc/client';

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function KioskAttendancePage() {
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const token = searchParams.get('token');
  const slug = searchParams.get('slug');

  const [employeeCode, setEmployeeCode] = useState('');
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data: kioskInfo } = trpc.hr.kiosk.validateToken.useQuery(
    { token: token! },
    { enabled: !!token },
  );

  const mutation = trpc.hr.attendance.logPublicAttendance.useMutation({
    onSuccess: (data) => {
      setResult({
        type: 'success',
        message: `Welcome, ${data.employeeName}! Clocked in at ${formatTime(data.punchTime)}`,
      });
      toast.success(`Welcome, ${data.employeeName}!`);
      setEmployeeCode('');
      setTimeout(() => {
        setResult(null);
        inputRef.current?.focus();
      }, 3000);
    },
    onError: (error) => {
      setResult({ type: 'error', message: error.message });
      toast.error(error.message);
      setEmployeeCode('');
      setTimeout(() => {
        setResult(null);
        inputRef.current?.focus();
      }, 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode.trim()) return;
    setResult(null);
    if (token) {
      mutation.mutate({ employeeCode: employeeCode.trim(), token });
    } else if (slug) {
      mutation.mutate({ employeeCode: employeeCode.trim(), organizationSlug: slug });
    }
  };

  if (!token && !slug) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <Monitor className="size-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle className="text-xl">Kiosk Not Configured</CardTitle>
            <CardDescription>
              This kiosk needs a token. Add <code className="bg-muted px-1 rounded">?token=your-kiosk-token</code> to the URL.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Clock className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">{kioskInfo?.name || 'Attendance Kiosk'}</CardTitle>
          <CardDescription>{formatDate(new Date())}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="empCode" className="text-sm font-medium text-muted-foreground">
                Employee Code
              </label>
              <Input
                ref={inputRef}
                id="empCode"
                type="text"
                placeholder="e.g. EMP-001"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                disabled={mutation.isPending}
                autoFocus
                autoComplete="off"
                className="h-14 text-lg text-center tracking-widest uppercase"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-lg"
              disabled={!employeeCode.trim() || mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-5 mr-2 animate-spin" />
                  Clocking In...
                </>
              ) : (
                'Clock In'
              )}
            </Button>
          </form>

          {result && (
            <Alert variant={result.type === 'success' ? 'default' : 'destructive'}>
              <AlertTitle>{result.type === 'success' ? 'Clocked In' : 'Error'}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
