"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToolbar } from "@/hooks/use-toolbar";
import { Customers } from "@/types/prisma/client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Check, Copy, MapPin, Phone } from "lucide-react";
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
            <Avatar className="h-32 w-32 border-4 border-border shrink-0">
              <AvatarImage className="object-cover" src={""} />
              <AvatarFallback className="text-3xl">{customer?.name?.charAt(0)}</AvatarFallback>
            </Avatar>

            {/* Title */}
            <div className="flex flex-col gap-8 ">
              <span className="items-center text-4xl font-bold">{customer?.name}</span>
              <span className="text-xl text-amber-50">{customer?.name}</span>
            </div>
            {/* Contact information */}
            <div className="max-lg:grid-cols-1 flex-1 gap-2 grid grid-cols-2 grid-rows-2 h-full ">
              <ContactInput icon={Phone} label="Phone" value="36860504" />
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
      <div className="flex flex-col rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring">
        {/* Label Row with Icon */}
        {label && (
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
            <Label className="p-0 m-0 text-xs font-medium text-muted-foreground">{label}</Label>
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
            <Textarea value={value} readOnly className={`min-h-20 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${label ? "pt-0" : ""}`} />
          ) : (
            <Input value={value} readOnly className={`border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${label ? "pt-0 h-9" : ""}`} />
          )}

          {/* Copy Button */}
          <Button type="button" variant="ghost" size="icon" onClick={handleCopy} className={`rounded-l-none shrink-0 ${label ? "mb-1" : "mt-1"}`}>
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
