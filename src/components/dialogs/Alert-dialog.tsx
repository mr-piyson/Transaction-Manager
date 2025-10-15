import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "../ui/button";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface AlertDialogProps {
  title: string;
  description: string;
  children: React.ReactNode;
  variant?:
    | "default"
    | "link"
    | "secondary"
    | "destructive"
    | "success"
    | "warning"
    | "outline"
    | "ghost";
  dismissText?: string;
  confirmText?: string;
  onDismiss?: () => void;
  onConfirm?: () => Promise<void> | void;
}

export function Alert_Dialog({
  title,
  description,
  children,
  variant = "default",
  dismissText = "Cancel",
  confirmText = "Confirm",
  onDismiss,
  onConfirm,
}: AlertDialogProps) {
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
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDismiss}>
            {dismissText}
          </AlertDialogCancel>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="border-2 min-w-[77px]"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
