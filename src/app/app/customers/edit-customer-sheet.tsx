'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Search, Plus, Edit2, Phone, Mail, MapPin, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Customer } from '@prisma/client';

// Zod Schema for strict end-to-end type safety
const customerSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: z.string().min(5, 'Valid phone number is required.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  address: z.string().min(3, 'Address is required.'),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export function CustomersClient() {
  const queryClient = useQueryClient();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Raw react-hook-form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
  });

  // --- React Query: Mutations ---
  const saveMutation = useMutation({
    mutationFn: async (payload: CustomerFormValues) => {
      if (payload.id) {
        const { data } = await axios.put(`/api/customers/${payload.id}`, payload);
        return data;
      }
      const { data } = await axios.post('/api/customers', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(editingId ? 'Customer updated' : 'Customer added');
      setIsSheetOpen(false);
    },
    onError: () => {
      toast.error('Failed to save customer data. Please try again.');
    },
  });

  const onSubmit = (data: CustomerFormValues) => {
    saveMutation.mutate(data);
  };

  return (
    <>
      {/* Slide-over Form using Standard HTML forms & Radix Labels */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto p-4">
          <SheetHeader className="mb-6">
            <SheetTitle>{editingId ? 'Edit Customer' : 'New Customer'}</SheetTitle>
            <SheetDescription>{editingId ? 'Update the details for this customer below.' : 'Fill in the details to add a new customer to the system.'}</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className={errors.name ? 'text-destructive' : ''}>
                Full Name
              </Label>
              <Input id="name" placeholder="e.g. Ali Hasan" {...register('name')} />
              {errors.name && <p className="text-[0.8rem] font-medium text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className={errors.phone ? 'text-destructive' : ''}>
                Phone Number
              </Label>
              {/* dir="ltr" ensures standard formatting regardless of app directionality */}
              <Input id="phone" placeholder="+973 3..." dir="ltr" className="text-left" {...register('phone')} />
              {errors.phone && <p className="text-[0.8rem] font-medium text-destructive">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className={errors.email ? 'text-destructive' : ''}>
                Email (Optional)
              </Label>
              <Input id="email" type="email" placeholder="ali@example.com" dir="ltr" className="text-left" {...register('email')} />
              {errors.email && <p className="text-[0.8rem] font-medium text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className={errors.address ? 'text-destructive' : ''}>
                Address
              </Label>
              <Input id="address" placeholder="Block, Road, Building..." {...register('address')} />
              {errors.address && <p className="text-[0.8rem] font-medium text-destructive">{errors.address.message}</p>}
            </div>

            <div className="pt-4 flex flex-wrap gap-3">
              <Button type="button" variant="outline" className="w-full" onClick={() => setIsSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Customer'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
