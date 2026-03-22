import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Contract } from '@prisma/client';
import { Calendar, Banknote, FilePenLine } from 'lucide-react';
import { Progress } from '@/components/ui/progress'; // Ensure this component is installed

export function ContractCard(props: { data: Contract }) {
  if (!props.data) return null;

  const { data } = props;

  // Calculate Progress Percentage
  const calculateProgress = () => {
    const start = new Date(data.startDate).getTime();
    const end = new Date(data.endDate).getTime();
    const now = new Date().getTime();

    if (now < start) return 0;
    if (now > end) return 100;

    const total = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / total) * 100);
  };

  const progressValue = calculateProgress();

  const formattedValue = data.contractValue
    ? (data.contractValue / 1000).toLocaleString('en-BH', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })
    : '0.000';

  return (
    <div className="flex items-center hover:bg-accent/50 gap-3 p-3 h-20 w-full bg-transparent group transition-colors">
      <Avatar className="size-11 rounded-lg shrink-0 after:border-0">
        <AvatarFallback
          className={cn(
            'rounded-lg transition-colors',
            data.active
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <FilePenLine className="size-5" />
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate text-sm text-foreground uppercase tracking-tight leading-none">
            {data.title}
          </p>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
            v{data.version}
          </span>
        </div>

        {/* Progress Bar with Date Labels */}
        <div className="w-full max-w-50 space-y-1">
          <Progress value={progressValue} className="h-1" />
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground italic leading-none">
            <span className="flex items-center gap-1">
              <Calendar className="size-2.5" />
              {new Date(data.startDate).toLocaleDateString()}
            </span>
            <span>→</span>
            <span className="flex items-center gap-1">{new Date(data.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="text-right flex flex-col justify-center items-end min-w-27.5 gap-1">
        <div className="flex items-center gap-1 text-primary font-bold text-sm leading-none">
          <Banknote className="size-3 text-muted-foreground/50" />
          <span className="text-[10px] font-normal text-muted-foreground mr-0.5">{data.currency}</span>
          {formattedValue}
        </div>

        <div
          className={cn(
            'text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-2 py-0.5 rounded-full border',
            data.active
              ? 'text-emerald-600 bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
              : 'text-muted-foreground bg-muted/50 border-transparent',
          )}
        >
          <span
            className={cn('size-1.5 rounded-full animate-pulse', data.active ? 'bg-emerald-500' : 'bg-slate-400')}
          />
          {data.active ? 'Active' : 'Inactive'}
        </div>
      </div>
    </div>
  );
}
