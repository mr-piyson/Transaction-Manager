import { Button } from '@/components/button';
import { Dates } from '@/lib/date';
import { Payment } from '@prisma/client';
import { Banknote, CreditCard, Trash2, Wallet } from 'lucide-react';
import { useDeletePayment } from '@/hooks/data/use-payments';
import { toast } from 'sonner';
import { Format } from '@/lib/format';

// Helper to get the correct icon/style based on method
const getMethodConfig = (method: string) => {
  switch (method) {
    case 'CASH':
      return { icon: <Banknote className="w-5 h-5" />, label: 'Cash' };
    case 'CARD':
      return { icon: <CreditCard className="w-5 h-5" />, label: 'Card' };
    default:
      return { icon: <Wallet className="w-5 h-5" />, label: 'Other' };
  }
};

export default function PaymentCard({
  payment,
  editable,
}: {
  payment: Payment;
  editable?: boolean;
}) {
  const { icon } = getMethodConfig(payment.method);
  const deletePayment = useDeletePayment();

  const handleDelete = () => {
    deletePayment.mutate(
      { id: payment.id, invoiceId: payment.invoiceId },
      {
        onError: (err) => {
          toast.error(err.message);
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-3 px-2 py-3 border-b border-border/40 group">
      {/* Icon Container */}
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>

      {/* Info Section */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{payment.method}</p>
        <p className="text-xs text-muted-foreground">{Format.date.relative(payment.date)}</p>
      </div>

      {/* Amount Section */}
      <span className="text-sm font-bold text-success-foreground tabular-nums">
        {Format.money.amount(payment.amount)}
      </span>

      {/* Actions */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={deletePayment.isPending}
        className="w-7 h-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
