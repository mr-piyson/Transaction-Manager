'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

type SwitchSize = 'xs' | 'sm' | 'default' | 'lg' | 'xl';

function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: SwitchSize;
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        // base styles
        'data-checked:bg-primary data-unchecked:bg-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 dark:data-unchecked:bg-input/80 shrink-0 rounded-full border border-transparent focus-visible:ring-3 aria-invalid:ring-3 peer group/switch relative inline-flex items-center transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 data-disabled:cursor-not-allowed data-disabled:opacity-50',

        // sizes (track)
        'data-[size=xs]:h-[12px] data-[size=xs]:w-[20px]',
        'data-[size=sm]:h-[14px] data-[size=sm]:w-[24px]',
        'data-[size=default]:h-[18px] data-[size=default]:w-[32px]',
        'data-[size=lg]:h-[22px] data-[size=lg]:w-[40px]',
        'data-[size=xl]:h-[26px] data-[size=xl]:w-[48px]',

        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-background dark:data-unchecked:bg-foreground dark:data-checked:bg-primary-foreground rounded-full pointer-events-none block ring-0 transition-transform',

          // thumb sizes
          'group-data-[size=xs]/switch:size-2.5',
          'group-data-[size=sm]/switch:size-3',
          'group-data-[size=default]/switch:size-4',
          'group-data-[size=lg]/switch:size-5',
          'group-data-[size=xl]/switch:size-6',

          // checked translation
          'group-data-[size=xs]/switch:data-checked:translate-x-[calc(100%-2px)]',
          'group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)]',
          'group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)]',
          'group-data-[size=lg]/switch:data-checked:translate-x-[calc(100%-2px)]',
          'group-data-[size=xl]/switch:data-checked:translate-x-[calc(100%-2px)]',

          // RTL support
          'rtl:group-data-[size=xs]/switch:data-checked:-translate-x-[calc(100%-2px)]',
          'rtl:group-data-[size=sm]/switch:data-checked:-translate-x-[calc(100%-2px)]',
          'rtl:group-data-[size=default]/switch:data-checked:-translate-x-[calc(100%-2px)]',
          'rtl:group-data-[size=lg]/switch:data-checked:-translate-x-[calc(100%-2px)]',
          'rtl:group-data-[size=xl]/switch:data-checked:-translate-x-[calc(100%-2px)]',

          // unchecked (reset)
          'group-data-[size=xs]/switch:data-unchecked:translate-x-0',
          'group-data-[size=sm]/switch:data-unchecked:translate-x-0',
          'group-data-[size=default]/switch:data-unchecked:translate-x-0',
          'group-data-[size=lg]/switch:data-unchecked:translate-x-0',
          'group-data-[size=xl]/switch:data-unchecked:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
