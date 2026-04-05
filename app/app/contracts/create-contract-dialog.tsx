'use client';

import React, { JSX, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, FilePenLine, Loader2, Banknote, Plus } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { trpc } from '@/trpc/client';

import * as z from 'zod';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Contract } from '@prisma/client';

export const contractSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional().or(z.literal('')),
  contractValue: z.coerce.number().min(0).optional(),
  currency: z.string().default('BHD'),
  startDate: z.string().min(10, 'Start date is required'),
  endDate: z.string().min(10, 'End date is required'),
});

export type ContractFormValues = z.infer<typeof contractSchema>;

interface ContractDialogProps {
  contract?: Contract; // if provided, it's edit mode
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  children?: JSX.Element;
}

export function ContractDialog({
  contract,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  onError,
  children,
}: ContractDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalOpen(open);
    }
  };

  const utils = trpc.useUtils();
  const createMutation = trpc.contracts.createContract.useMutation();
  const updateMutation = trpc.contracts.updateContract.useMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEdit = !!contract;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema) as any,
    defaultValues: {
      title: contract?.title || '',
      description: contract?.description || '',
      contractValue: contract?.contractValue ? contract?.contractValue / 1000 : 0,
      currency: contract?.currency || 'BHD',
      startDate: contract?.startDate
        ? new Date(contract.startDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      endDate: contract?.endDate
        ? new Date(contract.endDate).toISOString().split('T')[0]
        : new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            .toISOString()
            .split('T')[0],
    },
  });

  useEffect(() => {
    if (open) {
      if (contract) {
        reset({
          title: contract.title || '',
          description: contract.description || '',
          contractValue: contract.contractValue ? contract.contractValue / 1000 : 0,
          currency: contract.currency || 'BHD',
          startDate: contract.startDate
            ? new Date(contract.startDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          endDate: contract.endDate
            ? new Date(contract.endDate).toISOString().split('T')[0]
            : new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                .toISOString()
                .split('T')[0],
        });
      } else {
        reset({
          title: '',
          description: '',
          contractValue: 0,
          currency: 'BHD',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            .toISOString()
            .split('T')[0],
        });
      }
    }
  }, [open, contract, reset]);

  const onSubmit = async (values: ContractFormValues) => {
    const payload = {
      title: values.title,
      description: values.description || null,
      contractValue: values.contractValue ? Math.round(values.contractValue * 1000) : null,
      currency: values.currency,
      startDate: new Date(values.startDate),
      endDate: new Date(values.endDate),
    };

    if (isEdit) {
      updateMutation.mutate(
        { id: String(contract.id), data: payload as any },
        {
          onSuccess: (data) => {
            utils.contracts.getContracts.invalidate();
            setOpen(false);
            onSuccess?.(data);
          },
          onError: (err) => {
            toast.error('Failed to update contract');
            onError?.(err);
          },
        },
      );
    } else {
      createMutation.mutate({ ...payload, active: true } as any, {
        onSuccess: (data) => {
          utils.contracts.getContracts.invalidate();
          reset();
          setOpen(false);
          onSuccess?.(data);
          toast.success('Contract created successfully');
        },
        onError: (err) => {
          toast.error('Failed to create contract');
          onError?.(err);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          children ?? (
            <Button variant="default" className="gap-2">
              <Plus className="size-4" />
              Add Contract
            </Button>
          )
        }
      ></DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-row gap-2 text-primary text-2xl items-center">
            <FilePenLine />
            <span>{isEdit ? 'Edit Contract' : 'New Contract'}</span>
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details of your contract'
              : 'Enter the details to create a new contract.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.title} className="sm:col-span-2">
              <FieldLabel>Title</FieldLabel>
              <InputGroup>
                <InputGroupInput {...register('title')} placeholder="Contract Title..." />
                <InputGroupAddon>
                  <FilePenLine />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.title?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.startDate}>
              <FieldLabel>Start Date</FieldLabel>
              <InputGroup>
                <InputGroupInput type="date" {...register('startDate')} />
                <InputGroupAddon>
                  <Calendar />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.startDate?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.endDate}>
              <FieldLabel>End Date</FieldLabel>
              <InputGroup>
                <InputGroupInput type="date" {...register('endDate')} />
                <InputGroupAddon>
                  <Calendar />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.endDate?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.contractValue} className="sm:col-span-2">
              <FieldLabel>Contract Value ({contract?.currency || 'BHD'})</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  type="number"
                  step="0.001"
                  {...register('contractValue')}
                  placeholder="100.000"
                />
                <InputGroupAddon>
                  <Banknote />
                </InputGroupAddon>
              </InputGroup>
              <FieldError>{errors.contractValue?.message}</FieldError>
            </Field>

            <Field data-invalid={!!errors.description} className="sm:col-span-2">
              <FieldLabel>Description (Optional)</FieldLabel>
              <InputGroup>
                <InputGroupInput {...register('description')} placeholder="Brief description..." />
              </InputGroup>
              <FieldError>{errors.description?.message}</FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="min-w-30">
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEdit ? (
                'Update Contract'
              ) : (
                'Save Contract'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
