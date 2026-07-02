import { DialogsProvider } from '@/components/dialogs';

export default function HrmsLayout({ children }: { children: React.ReactNode }) {
  return <DialogsProvider>{children}</DialogsProvider>;
}
