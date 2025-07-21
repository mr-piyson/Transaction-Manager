import { Button } from "@/components/ui/button";
import { CreateRecordDialog, RecordListItem } from "./Records";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { getRecords } from "./Record.actions";

import { Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import RecordTable from "./Record-Table";
import { getAccount } from "@/app/Auth/auth.actions";

export async function RecordList(props: { Activity: string }) {
  const records = await getRecords();
  const account = await getAccount();
  return (
    <>
      <div className="top-12 bg-sidebar w-full h-12 px-1 py-2 flex gap-2 flex-row items-center border-b-1 shadow-md shadow-black/10 ">
        <AddNewRecordBTN />
        <div className="relative w-full">
          <Input
            type="text"
            placeholder="Search integrations..."
            className="w-full h-10 pl-12  bg-transparent"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        </div>
      </div>
      {account && <RecordTable account={account} />}

      <Card className="shadow-md rounded-none h-full">
        <CardContent>
          {(records ?? []).length > 0 ? (
            <ul className="flex flex-1 flex-col gap-2 p-4 ">
              {records?.map((record) => {
                return (
                  <Link
                    href={`/${props.Activity}/${record.id}`}
                    key={record.id}
                  >
                    <RecordListItem record={record} />
                  </Link>
                );
              })}
            </ul>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="bg-muted p-4 rounded-full">
                <Inbox className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No Records</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  You haven't added any Records to your collection. Add your
                  first Record to get started.
                </p>
              </div>
              <AddNewRecordBTN />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function AddNewRecordBTN(props: any) {
  return (
    <CreateRecordDialog>
      <Button
        variant={"default"}
        className="rounded-sm  text-sm font-semibold "
      >
        <Plus className=" size-5" />
        <span className="max-sm:hidden">New Record</span>
      </Button>
    </CreateRecordDialog>
  );
}
