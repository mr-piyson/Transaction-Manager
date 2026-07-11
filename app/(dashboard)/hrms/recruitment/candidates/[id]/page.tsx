'use client';

import { Briefcase, Calendar, Clock, FileText, Loader2, Plus, User } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc/client';
import { format } from 'date-fns';

const statusBadge: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  SCREENING: 'bg-yellow-100 text-yellow-800',
  INTERVIEWING: 'bg-purple-100 text-purple-800',
  OFFERED: 'bg-orange-100 text-orange-800',
  HIRED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-100 text-gray-800',
};

const offerStatusBadge: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-100 text-gray-800',
};

export default function CandidateDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewStage, setInterviewStage] = useState('');
  const [interviewScheduledAt, setInterviewScheduledAt] = useState('');
  const [interviewDuration, setInterviewDuration] = useState('');
  const [interviewerId, setInterviewerId] = useState('');
  const [updateInterviewDialogOpen, setUpdateInterviewDialogOpen] = useState(false);
  const [updateInterviewId, setUpdateInterviewId] = useState('');
  const [interviewResult, setInterviewResult] = useState('');
  const [interviewFeedback, setInterviewFeedback] = useState('');
  const [interviewScore, setInterviewScore] = useState('');
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerPosition, setOfferPosition] = useState('');
  const [offerSalary, setOfferSalary] = useState('');
  const [offerCurrency, setOfferCurrency] = useState('USD');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerExpiryDate, setOfferExpiryDate] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [respondAction, setRespondAction] = useState<'ACCEPT' | 'REJECT' | null>(null);
  const [respondReason, setRespondReason] = useState('');

  const { data: candidate, isLoading: candidateLoading } = trpc.hr.recruitment.candidates.byId.useQuery({ id });
  const { data: interviewsData, refetch: refetchInterviews } = trpc.hr.recruitment.candidates.interviewRounds.list.useQuery({ candidateId: id });
  const { data: offerData, refetch: refetchOffer } = trpc.hr.recruitment.candidates.offer.get.useQuery({ candidateId: id });
  const { data: employeesData } = trpc.hr.employees.list.useQuery({});

  const createInterviewMutation = trpc.hr.recruitment.candidates.interviewRounds.create.useMutation({
    onSuccess: () => { refetchInterviews(); setInterviewDialogOpen(false); resetInterviewForm(); toast.success('Interview scheduled'); },
    onError: (e) => toast.error(e.message),
  });

  const updateInterviewMutation = trpc.hr.recruitment.candidates.interviewRounds.update.useMutation({
    onSuccess: () => { refetchInterviews(); setUpdateInterviewDialogOpen(false); toast.success('Interview updated'); },
    onError: (e) => toast.error(e.message),
  });

  const createOfferMutation = trpc.hr.recruitment.candidates.offer.create.useMutation({
    onSuccess: () => { refetchOffer(); setOfferDialogOpen(false); resetOfferForm(); toast.success('Offer created'); },
    onError: (e) => toast.error(e.message),
  });

  const respondOfferMutation = trpc.hr.recruitment.candidates.offer.respond.useMutation({
    onSuccess: () => { refetchOffer(); setRespondDialogOpen(false); toast.success(`Offer ${respondAction?.toLowerCase()}ed`); },
    onError: (e) => toast.error(e.message),
  });

  const withdrawOfferMutation = trpc.hr.recruitment.candidates.offer.withdraw.useMutation({
    onSuccess: () => { refetchOffer(); toast.success('Offer withdrawn'); },
    onError: (e) => toast.error(e.message),
  });

  const interviews = Array.isArray(interviewsData) ? interviewsData : (interviewsData as any)?.data ?? [];
  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data ?? [];
  const offer = offerData as any;

  function resetInterviewForm() {
    setInterviewStage('');
    setInterviewScheduledAt('');
    setInterviewDuration('');
    setInterviewerId('');
  }

  function resetOfferForm() {
    setOfferPosition('');
    setOfferSalary('');
    setOfferCurrency('USD');
    setOfferStartDate('');
    setOfferExpiryDate('');
    setOfferNotes('');
  }

  if (candidateLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!candidate) {
    return <div className="text-center py-20 text-muted-foreground">Candidate not found.</div>;
  }

  const c = candidate as any;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            {c.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div><strong>Email:</strong> {c.email ?? '—'}</div>
            <div><strong>Phone:</strong> {c.phone ?? '—'}</div>
            <div><strong>Job Posting:</strong> {c.jobPosting?.title ?? '—'}</div>
            <div>
              <strong>Status:</strong>{' '}
              <Badge variant="outline" className={statusBadge[c.status] ?? ''}>{c.status}</Badge>
            </div>
            <div><strong>Source:</strong> {c.source ?? '—'}</div>
          </div>
          <div>
            <strong>Notes:</strong>
            <p className="text-muted-foreground mt-1">{c.notes ?? '—'}</p>
          </div>
          {c.resumeUrl && (
            <div>
              <a
                href={c.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
              >
                <FileText className="size-4" />
                View Resume
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="size-4" />
            Interviews
          </CardTitle>
          <Button size="sm" onClick={() => setInterviewDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            Schedule Interview
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {interviews.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No interviews scheduled.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead>Scheduled At</TableHead>
                  <TableHead>Interviewer</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((iv: any) => (
                  <TableRow key={iv.id}>
                    <TableCell className="text-sm">{iv.stage ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      {iv.scheduledAt ? format(new Date(iv.scheduledAt), 'dd MMM yyyy HH:mm') : '—'}
                    </TableCell>
                    <TableCell className="text-sm">{iv.interviewer?.user?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{iv.durationMin ? `${iv.durationMin}m` : '—'}</TableCell>
                    <TableCell className="text-sm">{iv.result ?? '—'}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{iv.feedback ?? '—'}</TableCell>
                    <TableCell className="text-sm">{iv.score != null ? iv.score : '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUpdateInterviewId(iv.id);
                          setInterviewResult(iv.result ?? '');
                          setInterviewFeedback(iv.feedback ?? '');
                          setInterviewScore(iv.score != null ? String(iv.score) : '');
                          setUpdateInterviewDialogOpen(true);
                        }}
                      >
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="size-4" />
            Offer
          </CardTitle>
          {!offer && (
            <Button size="sm" onClick={() => setOfferDialogOpen(true)}>
              <Plus className="size-4 mr-2" />
              Create Offer
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!offer ? (
            <p className="text-sm text-muted-foreground">No offer has been made yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Position:</strong> {offer.position ?? '—'}</div>
                <div><strong>Salary:</strong> {offer.salaryAmount ? `${offer.currency ?? ''} ${offer.salaryAmount}` : '—'}</div>
                <div><strong>Start Date:</strong> {offer.startDate ? format(new Date(offer.startDate), 'dd MMM yyyy') : '—'}</div>
                <div><strong>Expiry Date:</strong> {offer.expiryDate ? format(new Date(offer.expiryDate), 'dd MMM yyyy') : '—'}</div>
                <div>
                  <strong>Status:</strong>{' '}
                  <Badge variant="outline" className={offerStatusBadge[offer.status] ?? ''}>{offer.status}</Badge>
                </div>
              </div>
              {offer.notes && <div className="text-sm"><strong>Notes:</strong> {offer.notes}</div>}

              {offer.status === 'PENDING' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => { setRespondAction('ACCEPT'); setRespondReason(''); setRespondDialogOpen(true); }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => { setRespondAction('REJECT'); setRespondReason(''); setRespondDialogOpen(true); }}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { if (confirm('Withdraw this offer?')) withdrawOfferMutation.mutate({ id }); }}
                  >
                    Withdraw
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={interviewDialogOpen} onOpenChange={(open) => { setInterviewDialogOpen(open); if (!open) resetInterviewForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>Schedule a new interview round for this candidate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field orientation="vertical">
              <Label>Stage *</Label>
              <Input value={interviewStage} onChange={(e) => setInterviewStage(e.target.value)} placeholder="e.g. Phone Screen, Technical" />
            </Field>
            <Field orientation="vertical">
              <Label>Scheduled At *</Label>
              <Input type="datetime-local" value={interviewScheduledAt} onChange={(e) => setInterviewScheduledAt(e.target.value)} />
            </Field>
            <Field orientation="vertical">
              <Label>Duration (minutes)</Label>
              <Input type="number" value={interviewDuration} onChange={(e) => setInterviewDuration(e.target.value)} placeholder="e.g. 60" />
            </Field>
            <Field orientation="vertical">
              <Label>Interviewer</Label>
              <Select value={interviewerId} onValueChange={setInterviewerId}>
                <SelectTrigger><SelectValue placeholder="Select interviewer" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.user?.name ?? e.employeeCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!interviewStage || !interviewScheduledAt) { toast.error('Stage and Scheduled At are required'); return; }
                createInterviewMutation.mutate({
                  candidateId: id,
                  stage: interviewStage as "PHONE_SCREEN" | "TECHNICAL" | "MANAGERIAL" | "HR" | "FINAL",
                  scheduledAt: new Date(interviewScheduledAt),
                  durationMin: interviewDuration ? parseInt(interviewDuration) : undefined,
                  interviewerId: interviewerId || undefined,
                });
              }}
              disabled={createInterviewMutation.isPending}
            >
              {createInterviewMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={updateInterviewDialogOpen} onOpenChange={setUpdateInterviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Interview</DialogTitle>
            <DialogDescription>Record the result, feedback, and score.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field orientation="vertical">
              <Label>Result</Label>
              <Select value={interviewResult} onValueChange={setInterviewResult}>
                <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASSED">Passed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="vertical">
              <Label>Feedback</Label>
              <Textarea value={interviewFeedback} onChange={(e) => setInterviewFeedback(e.target.value)} placeholder="Interview feedback..." />
            </Field>
            <Field orientation="vertical">
              <Label>Score</Label>
              <Input type="number" min="0" max="100" value={interviewScore} onChange={(e) => setInterviewScore(e.target.value)} placeholder="e.g. 85" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateInterviewDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                updateInterviewMutation.mutate({
                  id: updateInterviewId,
                  result: (interviewResult || undefined) as "CANCELLED" | "PENDING" | "PASSED" | "FAILED" | undefined,
                  feedback: interviewFeedback || undefined,
                  score: interviewScore ? parseInt(interviewScore) : undefined,
                });
              }}
              disabled={updateInterviewMutation.isPending}
            >
              {updateInterviewMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={offerDialogOpen} onOpenChange={(open) => { setOfferDialogOpen(open); if (!open) resetOfferForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Offer</DialogTitle>
            <DialogDescription>Create a job offer for this candidate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field orientation="vertical">
              <Label>Position *</Label>
              <Input value={offerPosition} onChange={(e) => setOfferPosition(e.target.value)} placeholder="e.g. Senior Software Engineer" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <Label>Salary Amount *</Label>
                <Input type="number" value={offerSalary} onChange={(e) => setOfferSalary(e.target.value)} placeholder="e.g. 120000" />
              </Field>
              <Field orientation="vertical">
                <Label>Currency</Label>
                <Select value={offerCurrency} onValueChange={setOfferCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <Label>Start Date *</Label>
                <DatePicker value={offerStartDate} onChange={(v) => setOfferStartDate(v)} />
              </Field>
              <Field orientation="vertical">
                <Label>Expiry Date</Label>
                <DatePicker value={offerExpiryDate} onChange={(v) => setOfferExpiryDate(v)} />
              </Field>
            </div>
            <Field orientation="vertical">
              <Label>Notes</Label>
              <Textarea value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} placeholder="Offer notes..." />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!offerPosition || !offerSalary || !offerStartDate) { toast.error('Position, Salary, and Start Date are required'); return; }
                createOfferMutation.mutate({
                  candidateId: id,
                  position: offerPosition,
                  salaryAmount: parseFloat(offerSalary),
                  currency: offerCurrency as "USD" | "BHD" | "EUR" | "GBP" | "JPY" | "AED" | "SAR" | "KWD" | "QAR" | "OMR" | undefined,
                  startDate: offerStartDate,
                  expiryDate: offerExpiryDate || undefined,
                  notes: offerNotes || undefined,
                });
              }}
              disabled={createOfferMutation.isPending}
            >
              {createOfferMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{respondAction === 'ACCEPT' ? 'Accept Offer' : 'Reject Offer'}</DialogTitle>
            <DialogDescription>
              {respondAction === 'ACCEPT'
                ? 'Confirm acceptance of this offer.'
                : 'Provide a reason for rejecting this offer.'}
            </DialogDescription>
          </DialogHeader>
          {respondAction === 'REJECT' && (
            <Field orientation="vertical">
              <Label>Reason</Label>
              <Textarea value={respondReason} onChange={(e) => setRespondReason(e.target.value)} placeholder="Reason for rejection..." />
            </Field>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => respondOfferMutation.mutate({ id, status: respondAction === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' })}
              disabled={respondOfferMutation.isPending}
            >
              {respondOfferMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
