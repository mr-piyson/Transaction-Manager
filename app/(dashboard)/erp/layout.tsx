import { DialogsProvider } from '@/components/dialogs';

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return <DialogsProvider>{children}</DialogsProvider>;
}
