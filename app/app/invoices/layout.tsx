import { FileText } from 'lucide-react';
import { Header } from '../App-Header';

type InvoiceLayoutProps = {
  children?: React.ReactNode;
};

export default function InvoiceLayout(props: InvoiceLayoutProps) {
  return (
    <>
      <Header title="Invoices" icon={<FileText />} />
      {props.children}
    </>
  );
}
