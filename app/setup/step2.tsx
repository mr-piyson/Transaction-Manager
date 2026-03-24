'use client';

import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SetupData } from './setup-types';

export function Step2Organization() {
  const {
    register,
    formState: { errors },
  } = useFormContext<SetupData>();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Organization Name *</Label>
        <Input {...register('orgName')} autoFocus />
        {errors.orgName && <p className="text-xs text-destructive">{errors.orgName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Website</Label>
        <Input {...register('website')} placeholder="https://..." />
        {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
      </div>
    </div>
  );
}
