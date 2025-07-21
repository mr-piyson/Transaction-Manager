import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Clock, Eye, User } from "lucide-react";

export function TicketMobileItem(props: any) {
  const { ticket } = props;
  return (
    <>
      {/* Mobile Cards */}
      <div className="space-y-4">
        <Card
          key={ticket.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {}}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{ticket.id}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {ticket.title}
                </p>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {ticket.description}
            </p>

            <div className="flex flex-wrap gap-2">
              <Badge>{ticket.status}</Badge>
              <Badge>{ticket.priority}</Badge>
              <Badge variant="outline">{ticket.category}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Assigned to:</span>
                </div>
                <div className="font-medium">{ticket.assignedTo}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Created:</span>
                </div>
                <div className="font-medium">
                  {format(new Date(ticket.createdAt), "MMM dd, yyyy")}
                </div>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Requester: </span>
              <span className="font-medium">{ticket.requester}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
