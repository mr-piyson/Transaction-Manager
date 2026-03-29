import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package } from 'lucide-react';
import { useCreateInvoiceLine } from '@/hooks/data/use-invoiceLines';
import { toast } from 'sonner';

interface CreateGroupDialogProps {
  invoiceId: string;
  children: React.JSX.Element;
}

export function CreateGroupDialog({ invoiceId, children }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const { mutate: createLine, isPending } = useCreateInvoiceLine();

  const handleCreate = () => {
    if (!title.trim()) return;
    createLine(
      {
        invoiceId: Number(invoiceId),
        isGroup: true,
        description: title,
      },
      {
        onSuccess: () => {
          toast.success('Group created successfully');
          setOpen(false);
          setTitle('');
        },
        onError: (error) => {
          toast.error('Failed to create group: ' + error.message);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children}></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Item Group</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Input 
            placeholder="Group Title (e.g. Labor or Material)" 
            value={title} 
            autoFocus
            onChange={(e) => setTitle(e.target.value)} 
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={isPending || !title.trim()} onClick={handleCreate}>
            <Package className="w-4 h-4 mr-2" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
