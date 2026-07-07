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
import { CURRENCIES, type CurrencyCode } from '@/lib/utils';
import type { SetupData } from './setup-types';

export function Step1Language() {
  const { setValue, watch } = useFormContext<SetupData>();

  const language = watch('language');
  const currency = watch('currency');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>System Language</Label>
        <Select
          value={language}
          onValueChange={(val) => setValue('language', val as 'en' | 'ar', { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ar">العربية</SelectItem>
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
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
              <SelectItem key={code} value={code}>
                {code} – {CURRENCIES[code].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
