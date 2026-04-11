'use client';

import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormValues = {
  name: string;
  address: string;
};

export function WarehouseForm({
  initialData,
  onSubmit,
}: {
  initialData?: FormValues;
  onSubmit: (data: FormValues) => void;
}) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: initialData || { name: '', address: '' },
  });

  const handleFormSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Warehouse Details</h2>
        <p className="text-sm text-muted-foreground">Add or update your warehouse information</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name">Warehouse Name</Label>
          <Input
            id="name"
            placeholder="e.g. Main Storage Facility"
            autoFocus
            {...register('name', { required: 'Warehouse name is required' })}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        {/* Address Field */}
        <div className="space-y-2">
          <Label htmlFor="address">Address / Location</Label>
          <Input
            id="address"
            placeholder="e.g. Manama, Bahrain"
            {...register('address', {
              required: 'Address is required',
            })}
          />
          {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={loading} className="min-w-[140px]">
            {loading ? 'Saving...' : 'Save Warehouse'}
          </Button>
        </div>
      </form>
    </div>
  );
}
