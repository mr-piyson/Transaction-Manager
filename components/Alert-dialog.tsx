import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";
import { useState } from "react";
import { Spinner } from "./ui/spinner";

interface AlertDialogProps {
  title: string;
  description: string;
  children: React.ReactNode;
  variant?: "default" | "link" | "secondary" | "destructive" | "outline" | "ghost";
  dismissText?: string;
  confirmText?: string;
  onDismiss?: () => void;
  onConfirm?: () => Promise<void> | void;
}

export function Alert_Dialog({ title, description, children, variant = "default", dismissText = "Cancel", confirmText = "Confirm", onDismiss, onConfirm }: AlertDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (onConfirm) {
        await onConfirm();
      }
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <div>{children}</div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDismiss}>{dismissText}</AlertDialogCancel>
          <Button variant={variant} onClick={handleConfirm} disabled={isLoading} className="border-2 min-w-[77px]">
            {isLoading ? <Spinner /> : confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
