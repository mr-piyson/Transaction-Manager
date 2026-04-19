'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Briefcase, Calendar, User } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';

// Schema aligned with your Prisma Job model [cite: 22, 23]
const jobSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().optional(),
  customerId: z.string().min(1, 'Please select a customer'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']).default('NOT_STARTED'),
});

type JobFormValues = z.infer<typeof jobSchema>;

export default function CreateJobPage() {
  const { data: customers } = trpc.customers.getCustomers.useQuery();
  const utils = trpc.useUtils();
  const router = useRouter();
  const createJob = trpc.jobs.createJob.useMutation({
    onSuccess: (data) => {
      router.push(`/app/jobs/${data.id}}`);
      utils.jobs.getJobs.invalidate();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JobFormValues>({
    defaultValues: { status: 'NOT_STARTED' },
  });

  const onSubmit = (data: JobFormValues) => {
    createJob.mutate({
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
  };

  return (
    <div className="max-w-8xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Project Job</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Define a new scope of work for your client and track its lifecycle.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Details Section */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <FormSection title="Job Identity" icon={<Briefcase size={18} />}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Job Title</label>
                  <input
                    {...register('title')}
                    placeholder="e.g. Website Maintenance Q2"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                  {errors.title && (
                    <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description</label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    placeholder="Brief summary of the job requirements..."
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Timeline" icon={<Calendar size={18} />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-muted-foreground">
                    Start Date
                  </label>
                  <input
                    type="date"
                    {...register('startDate')}
                    className="w-full px-3 py-2 border rounded-md outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-muted-foreground">
                    Expected End Date
                  </label>
                  <input
                    type="date"
                    {...register('endDate')}
                    className="w-full px-3 py-2 border rounded-md outline-none"
                  />
                </div>
              </div>
            </FormSection>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
            <FormSection title="Classification" icon={<User size={18} />}>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Assigned Customer</label>
                  <select
                    {...register('customerId')}
                    className="w-full px-3 py-2 border rounded-md  outline-none"
                  >
                    <option value="">Select a customer...</option>
                    {customers?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Initial Status</label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 border rounded-md  outline-none font-bold text-sm"
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
            </FormSection>

            <button
              type="submit"
              disabled={createJob.isPending}
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {createJob.isPending ? 'Creating...' : 'Create Job Record'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// Internal DRY helper for form sections
function FormSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}
