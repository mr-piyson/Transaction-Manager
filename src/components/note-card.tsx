"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, MoreVertical, Edit2, Copy, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  timestamp: Date;
}

interface Note {
  id: string;
  title: string;
  customer?: Customer;
  transactions: Transaction[];
  createdAt: Date;
  updatedAt: Date;
}

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function NoteCard({ note, onClick, onEdit, onDuplicate, onDelete }: NoteCardProps) {
  const getTotalBalance = (note: Note) => {
    return note.transactions.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
  };

  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 cursor-pointer" onClick={onClick}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-foreground">{note.title}</h3>
            <Badge variant={getTotalBalance(note) >= 0 ? "default" : "destructive"}>${Math.abs(getTotalBalance(note)).toFixed(2)}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{note.transactions.length} transactions</span>
            {note.customer && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {note.customer.name}
              </span>
            )}
            <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
