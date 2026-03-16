'use client';
import { alert } from '@/components/Alert-dialog';
import { Button } from '@/components/button';
import { Header } from '@/components/Header';
import { ArrowLeft } from 'lucide-react';
import { PaymentDialog } from './payments-dialog';
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
      />
      <main className="flex-1"></main>
      <footer>
        <PaymentDialog>
          <Button>Hello world</Button>
        </PaymentDialog>
      </footer>
    </>
  );
}
