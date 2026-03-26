'use client';

import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { SetupData } from './setup-types';

export function Step2Organization() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<SetupData>();

  const orgName = watch('orgName');
  const slug = watch('slug');

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (!isSlugManuallyEdited && orgName) {
      const suggestedSlug = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', suggestedSlug, { shouldValidate: true });
    }
  }, [orgName, isSlugManuallyEdited, setValue]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Organization Name *</Label>
        <Input {...register('orgName')} autoFocus placeholder="My Awesome Org" />
        {errors.orgName && <p className="text-xs text-destructive">{errors.orgName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Organization Slug *</Label>
        <div className="flex items-center gap-2">
          <Input
            {...register('slug')}
            onChange={(e) => {
              setIsSlugManuallyEdited(true);
              register('slug').onChange(e);
            }}
            placeholder="my-awesome-org"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          This will be used for your unique portal link. Use lowercase, numbers, and hyphens.
        </p>
        {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Website</Label>
        <Input {...register('website')} placeholder="https://..." />
        {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
      </div>
    </div>
  );
}
