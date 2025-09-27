import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="h-full bg-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Note Not Found
        </h2>
        <p className="text-muted-foreground mb-4">
          The note you're looking for doesn't exist.
        </p>
        <Link href="/App/Notes/notes">
          <Button>Back to Notes</Button>
        </Link>
      </div>
    </div>
  );
}
