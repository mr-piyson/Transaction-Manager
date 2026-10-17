import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="font-semibold text-xl">Access denied</h1>
        <p className="max-w-md text-muted-foreground text-sm">
          You don&apos;t have permission to view this page. If you believe this
          is a mistake, ask an administrator to grant your role the required
          permission in Settings &rarr; Permissions.
        </p>
      </div>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href="/" />}
      >
        Back to dashboard
      </Button>
    </div>
  );
}
