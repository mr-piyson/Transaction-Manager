"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToolbar } from "@/hooks/use-toolbar";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Calendar, Mail, MapPinIcon, Phone } from "lucide-react";
import { use } from "react";
import { ContactInput } from "./customer-prop";
import { Skeleton } from "@/components/ui/skeleton";
import RecordTable from "./Records-Table";
import { Records } from "@/types/prisma/client";

type CustomerPageProps = {
  children?: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default function CustomerPage(props: CustomerPageProps) {
  const { id } = use(props.params);
  const toolbar = useToolbar();

  const {
    data: customer,
    isLoading,
    error,
  } = useQuery<Records>({
    queryKey: ["customer", id],
    queryFn: async () => (await axios.get(`/api/records/${id}`)).data,
  });

  return (
    <div className="flex flex-col w-full h-full">
      <Card className="rounded-none border-0">
        <CardContent>
          <div className="flex flex-col items-center md:flex-row gap-6">
            {/* Avatar */}
            <Avatar className="h-32 w-32 border-4 border-primary shrink-0">
              <AvatarImage className="object-cover" src={""} />
              <AvatarFallback className="text-3xl">{customer?.name?.charAt(0)}</AvatarFallback>
            </Avatar>

            {/* Title */}
            <div className="flex flex-col gap-8 max-sm:items-center">
              <span className="items-center text-4xl font-bold w-sm text-justify text-wrap">{customer?.name ?? <Skeleton />}</span>
              <Badge variant={"outline"} className="flex items-center border-primary border-2 x-3 gap-2  text-sm ">
                {customer?.code ?? <Skeleton />}
              </Badge>
            </div>
            {/* Contact information */}
            <div className="flex-1 gap-2 grid grid-cols-2 max-lg:grid-cols-1 h-full w-full">
              <ContactInput icon={Phone} label="Phone" value={customer?.phone} />
              <ContactInput icon={MapPinIcon} label="Address" value={customer?.address} />
              <ContactInput icon={Mail} label="Email" value={customer?.email} />
              <ContactInput icon={Calendar} label="Date" value={new Date(String(customer?.createdAt)).toLocaleDateString()} />
            </div>
          </div>
        </CardContent>
      </Card>
      <RecordTable />
    </div>
  );
}
