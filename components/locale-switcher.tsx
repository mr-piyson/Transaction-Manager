'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useLocaleSwitcher } from '@/hooks/use-locale';
import { Check, Languages } from 'lucide-react';
import {
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

const locales = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
] as const;

export function LocaleSwitcherMenu() {
  const t = useTranslations('locale');
  const locale = useLocale();
  const { switchLocale } = useLocaleSwitcher();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages className="mr-2 h-4 w-4" />
        <span>{t('switchLanguage')}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          {locales.map((l) => (
            <button
              key={l.code}
              onClick={() => switchLocale(l.code)}
              className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              {locale === l.code && <Check className="mr-2 h-4 w-4" />}
              <span className={locale === l.code ? '' : 'ml-6'}>{t(l.code as 'en' | 'ar')}</span>
            </button>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
