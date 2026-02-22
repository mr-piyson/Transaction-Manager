"use client";

import { Button } from "@/components/button";
import { Spinner } from "@/components/ui/spinner";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export default function App_Page(props: any) {
  const trpc = useTRPC();
  const greeting = useQuery(trpc.hello.queryOptions({ text: "world" }));
  console.log(greeting.data?.greeting);
  return (
    <div className="p-4 space-y-4">
      {greeting.isFetching ? (
        <Spinner />
      ) : (
        <h1 className="text-2xl font-bold">{greeting.data?.greeting}</h1>
      )}
      <Button onClick={() => greeting.refetch()}>Refresh</Button>
    </div>
  );
}
