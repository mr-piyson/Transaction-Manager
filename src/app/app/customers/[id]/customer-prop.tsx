import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface ContactInputProps {
  value: string | null | undefined;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  multiline?: boolean;
  onCopy?: (value: string) => void;
}

export function ContactInput({ value, label, icon: Icon, multiline = false, onCopy }: ContactInputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (value) {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        onCopy?.(value);
        setTimeout(() => setCopied(false), 2000);
      }
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
            <Button type="button" variant="ghost" size="icon" onClick={handleCopy} className={` hover:text-foreground text-foreground/50 rounded-l-none shrink-0 `}>
              {copied ? <Check className=" h-4 w-4 text-green-600" /> : <Copy className=" h-4 w-4" />}
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
            <Textarea value={value ?? ""} readOnly className={` bg-transparent min-h-20 resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${label ? "pt-0" : ""}`} />
          ) : (
            <Input value={value ?? ""} readOnly className={`bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${label ? "pt-0 h-9" : ""}`} />
          )}
        </div>
      </div>
    </div>
  );
}
