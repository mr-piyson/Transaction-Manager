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
              <span className="items-center text-4xl font-bold max-w-sm text-justify text-wrap">{customer?.name}</span>
              <Badge variant={"outline"} className="flex items-center border-primary px-3 gap-2  text-sm ">
                <Dot className="scale-200 text-primary" /> {customer?.code ?? "Empty"}
              </Badge>
            </div>
            {/* Contact information */}
            <div className="max-lg:grid-cols-1 flex-1 gap-2 grid grid-cols-2 grid-rows-2 h-full w-full ">
              <ContactInput icon={Phone} label="Phone" value={customer?.phone ?? "Empty"} />
              <ContactInput icon={MapPinIcon} label="Phone" value={customer?.address ?? "Empty"} />
              <ContactInput icon={Mail} label="Phone" value={customer?.email ?? "Empty"} />
              <ContactInput icon={Calendar} label="Phone" value={String(customer?.createdAt) ?? "Empty"} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ContactInputProps {
  value: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  multiline?: boolean;
  onCopy?: (value: string) => void;
}

export function ContactInput({ value, label, icon: Icon, multiline = false, onCopy }: ContactInputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy?.(value);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="w-full">
      {/* Input Container with Label Inside */}
      <div className=" px-1 pb-1 flex flex-col rounded-md border bg-card focus-within:ring-1 focus-within:ring-ring ">
        {/* Label Row with Icon */}
        {label && (
          <div className="flex items-center  ms-3 ">
            {Icon && <Icon className=" h-4 w-4 text-muted-foreground shrink-0" />}
            <Label className="flex-1 ms-3 text-xs font-medium text-muted-foreground">{label}</Label>
            {/* Copy Button */}
            <Button type="button" variant="ghost" size="icon" onClick={handleCopy} className={`rounded-l-none shrink-0 `}>
              {copied ? <Check className=" h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {/* Value Row */}
        <div className="flex items-start">
          {/* Left Icon (only if no label) */}
          {Icon && !label && (
            <div className="px-3 pt-3 text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>
          )}

          {/* Input or Textarea */}
          {multiline ? (
            <Textarea value={value} readOnly className={` bg-transparent min-h-20 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${label ? "pt-0" : ""}`} />
          ) : (
            <Input value={value} readOnly className={`bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${label ? "pt-0 h-9" : ""}`} />
          )}
        </div>
      </div>
    </div>
  );
}
