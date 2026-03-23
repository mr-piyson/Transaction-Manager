'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { SetupData } from './setup-wizard-types';

export function Step3Admin() {
  const {
    register,
    formState: { errors },
  } = useFormContext<SetupData>();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          {...register('adminFirstName')}
          placeholder="First Name"
          autoFocus
        />
        {errors.adminFirstName && (
          <p className="text-xs text-destructive">
            {errors.adminFirstName.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Input
          {...register('adminLastName')}
          placeholder="Last Name (optional)"
        />
      </div>

      <div className="space-y-2">
        <Input {...register('adminEmail')} placeholder="Email" type="email" />
        {errors.adminEmail && (
          <p className="text-xs text-destructive">
            {errors.adminEmail.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Input
          {...register('adminPassword')}
          placeholder="Password (min. 6 characters)"
          type="password"
        />
        {errors.adminPassword && (
          <p className="text-xs text-destructive">
            {errors.adminPassword.message}
          </p>
        )}
      </div>
    </div>
  );
}
