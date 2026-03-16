'use client';
import { Button } from '@/components/button';
import { Header } from '@/components/Header';
import { ArrowLeft, DollarSign, HandCoinsIcon } from 'lucide-react';
import { PaymentDialog } from './payments-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
type InvoiceEditorProps = {
  children?: React.ReactNode;
};

export default function InvoiceEditor(props: InvoiceEditorProps) {
  return (
    <>
      <Header
        leftContent={
          <div className="flex items-center gap-2">
            <Button variant={'ghost'} className="text-muted-foreground">
              <ArrowLeft size={16} /> <span className="max-sm:hidden">Back</span>
            </Button>
            <div className="flex flex-col">
              <span>#INV-0001</span>
              <span className="text-sm text-muted-foreground">Muntadher</span>
            </div>
          </div>
        }
        rightContent={
          <>
            <PaymentDialog>
              <Button disabled variant={'success'}>
                <HandCoinsIcon />
                Payment
              </Button>
            </PaymentDialog>
            {/* <Label>
              <DollarSign className="absolute text-muted-foreground ms-2" size={16} />
              <Input type="number" className="ps-8 w-26" placeholder="Tax" />
            </Label> */}
          </>
        }
      />
      <main className="flex-1"></main>
      <footer></footer>
    </>
  );
}
