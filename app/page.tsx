import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Page() {
  return (
    <div className="flex items-center justify-center w-full h-full ">
      <h1>This is the Landding page</h1>
      <Link href="/auth">
        <Button>Login</Button>
      </Link>
    </div>
  );
}
