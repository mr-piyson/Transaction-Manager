import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign } from "lucide-react";

type SaleCardProps = {
  children?: React.ReactNode;
  record: {
    id: number;
    clientName: string;
    clientInitials: string;
    clientAvatar: string;
    dealValue: number;
    status: string;
    lastContact: string;
    description: string;
    priority: string;
  };
};

export default function SaleCard(props: SaleCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={props.record.clientAvatar || "/placeholder.svg"}
                alt={props.record.clientName}
              />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {props.record.clientInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg text-balance">
                {props.record.clientName}
              </CardTitle>
              <CardDescription className="text-pretty">
                {props.record.description}
              </CardDescription>
            </div>
          </div>
          <Badge variant={"default"}>{props.record.priority}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              ${props.record.dealValue.toLocaleString()}
            </span>
          </div>
          <Badge variant={"warning"}>{props.record.status}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Last contact: {props.record.lastContact}</span>
        </div>
      </CardContent>
    </Card>
  );
}
