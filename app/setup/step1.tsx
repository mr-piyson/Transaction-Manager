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
import { Locale } from '@/i18n/config';
import { useI18n } from '@/i18n/use-i18n';
import { SetupData } from './setup-types';
import { CurrencyCode } from '@/lib/utils';

export function Step1Language() {
  const { setValue, watch } = useFormContext<SetupData>();
  const { availableLocales, setLocale } = useI18n();

  const language = watch('language');
  const currency = watch('currency');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>System Language</Label>
        <Select
          value={language}
          onValueChange={(val) => {
            setValue('language', val as Locale, { shouldValidate: true });
            setLocale(val as Locale);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableLocales.map((l) => (
              <SelectItem key={l} value={l}>
                {l === 'ar' ? 'العربية' : 'English'}
              </SelectItem>
            ))}
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
