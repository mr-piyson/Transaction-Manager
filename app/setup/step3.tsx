'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SetupData } from './setup-types';

export function Step3Admin() {
  const {
    register,
    formState: { errors },
  } = useFormContext<SetupData>();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="adminFirstName">First Name *</Label>
          <Input id="adminFirstName" {...register('adminFirstName')} placeholder="John" autoFocus />
          {errors.adminFirstName && (
            <p className="text-xs text-destructive">{errors.adminFirstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminLastName">Last Name</Label>
          <Input id="adminLastName" {...register('adminLastName')} placeholder="Doe" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminEmail">Email *</Label>
        <Input id="adminEmail" {...register('adminEmail')} placeholder="admin@company.com" type="email" />
        {errors.adminEmail && (
          <p className="text-xs text-destructive">{errors.adminEmail.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminPassword">Password *</Label>
        <Input
          id="adminPassword"
          {...register('adminPassword')}
          placeholder="Minimum 6 characters"
          type="password"
        />
        {errors.adminPassword && (
          <p className="text-xs text-destructive">{errors.adminPassword.message}</p>
        )}
      </div>
    </div>
  );
}
