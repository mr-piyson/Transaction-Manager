import { DialogsProvider } from '@/components/dialogs';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <DialogsProvider>{children}</DialogsProvider>;
}
