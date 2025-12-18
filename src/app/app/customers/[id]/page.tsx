"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToolbar } from "@/hooks/use-toolbar";
import { Customers } from "@/types/prisma/client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Calendar, Check, CircleDot, Copy, Dot, Mail, MapPin, MapPinIcon, Phone } from "lucide-react";
import { use, useState } from "react";
import { toast } from "sonner";
import { ContactInput } from "./customer-prop";
import { Skeleton } from "@/components/ui/skeleton";

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
  } = useQuery<Customers>({
    queryKey: ["customer", id],
    queryFn: async () => (await axios.get(`/api/customers/${id}`)).data,
  });

  return (
    <div>
      <Card>
        <CardContent>
          <div className="flex flex-col items-center md:flex-row gap-6">
            {/* Avatar */}
            <Avatar className="h-32 w-32 border-4 border-primary shrink-0">
              <AvatarImage className="object-cover" src={""} />
              <AvatarFallback className="text-3xl">{customer?.name?.charAt(0)}</AvatarFallback>
            </Avatar>

            {/* Title */}
            <div className="flex flex-col gap-8 max-sm:items-center">
              <span className="items-center text-4xl font-bold max-w-sm text-justify text-wrap">{customer?.name ?? <Skeleton />}</span>
              <Badge variant={"outline"} className="flex items-center border-primary px-3 gap-2  text-sm ">
                <Dot className="scale-200 text-primary" /> {customer?.code ?? <Skeleton />}
              </Badge>
            </div>
            {/* Contact information */}
            <div className="max-lg:grid-cols-1 flex-1 gap-2 grid grid-cols-2 grid-rows-2 h-full w-full ">
              <ContactInput icon={Phone} label="Phone" value={customer?.phone} />
              <ContactInput icon={MapPinIcon} label="Phone" value={customer?.address} />
              <ContactInput icon={Mail} label="Phone" value={customer?.email} />
              <ContactInput icon={Calendar} label="Phone" value={String(customer?.createdAt)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
