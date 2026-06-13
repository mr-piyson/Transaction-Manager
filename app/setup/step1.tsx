'use client';

import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CurrencyCode } from '@/lib/utils';
import type { SetupData } from './setup-types';

export function Step1Language() {
  const { setValue, watch } = useFormContext<SetupData>();

  const language = watch('language');
  const currency = watch('currency');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>System Language</Label>
        <Select value={language}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={'English'}>English</SelectItem>
            <SelectItem value={'Arabic'}>العربية</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Default Currency</Label>
        <Select
          value={currency}
          onValueChange={(val) =>
            setValue('currency', val as CurrencyCode, { shouldValidate: true })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BHD">BHD – Bahraini Dinar</SelectItem>
            <SelectItem value="USD">USD – US Dollar</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
