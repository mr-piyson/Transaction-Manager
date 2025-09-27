"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NoteCard } from "@/components/note-card";
import { Plus, Search, Filter, DollarSign } from "lucide-react";
import type { Note, Customer } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
    },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "title" | "balance"
  >("newest");
  const [filterBy, setFilterBy] = useState<
    "all" | "with-customer" | "without-customer"
  >("all");
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState("");

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("transaction-notes");
    if (savedNotes) {
      const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
        transactions: note.transactions.map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp),
        })),
      }));
      setNotes(parsedNotes);
    }
  }, []);

  // Save notes to localStorage whenever notes change
  useEffect(() => {
    localStorage.setItem("transaction-notes", JSON.stringify(notes));
  }, [notes]);

  const getTotalBalance = (note: Note) => {
    return note.transactions.reduce(
      (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
      0
    );
  };

  const createNote = () => {
    if (!newNoteTitle.trim()) return;

    const selectedCustomer = selectedCustomerId
      ? customers.find((c) => c.id === selectedCustomerId)
      : undefined;

    const note: Note = {
      id: Date.now().toString(),
      title: newNoteTitle,
      customer: selectedCustomer,
      transactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setNotes([...notes, note]);
    setNewNoteTitle("");
    setSelectedCustomerId("");
    setShowNewNote(false);

    // Navigate to the new note
    router.push(`/App/Notes/notes/${note.id}`);
  };

  const updateNote = () => {
    if (!editingNote || !editNoteTitle.trim()) return;

    const updatedNote = {
      ...editingNote,
      title: editNoteTitle,
      updatedAt: new Date(),
    };
    setNotes(
      notes.map((note) => (note.id === editingNote.id ? updatedNote : note))
    );

    setEditingNote(null);
    setEditNoteTitle("");
  };

  const duplicateNote = (noteId: string) => {
    const originalNote = notes.find((n) => n.id === noteId);
    if (!originalNote) return;

    const duplicatedNote: Note = {
      ...originalNote,
      id: Date.now().toString(),
      title: `${originalNote.title} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setNotes([...notes, duplicatedNote]);
  };

  const deleteNote = (noteId: string) => {
    setNotes(notes.filter((n) => n.id !== noteId));
  };

  const filteredAndSortedNotes = notes
    .filter((note) => {
      // Search filter
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.transactions.some((t) =>
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Customer filter
      const matchesFilter =
        filterBy === "all" ||
        (filterBy === "with-customer" && note.customer) ||
        (filterBy === "without-customer" && !note.customer);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "title":
          return a.title.localeCompare(b.title);
        case "balance":
          return getTotalBalance(b) - getTotalBalance(a);
        default:
          return 0;
      }
    });

  return (
    <div className="h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">•</span>
            <span className="text-lg font-medium text-foreground">
              All Notes
            </span>
          </div>
          <div className="flex gap-2">
            <Link href="/customers">
              <Button size="sm" variant="outline">
                Customers
              </Button>
            </Link>
            <Button
              onClick={() => setShowNewNote(true)}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Note
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {notes.length > 0 && (
          <div className="mb-6 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes, customers, or transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-1" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterBy("all")}>
                    All Notes {filterBy === "all" && "✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterBy("with-customer")}
                  >
                    With Customer {filterBy === "with-customer" && "✓"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterBy("without-customer")}
                  >
                    Without Customer {filterBy === "without-customer" && "✓"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex gap-2">
              <Label className="text-sm text-muted-foreground self-center">
                Sort by:
              </Label>
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="balance">Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Notes Grid */}
        <div className="grid gap-4">
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No notes yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first transaction note to get started
              </p>
              <Button onClick={() => setShowNewNote(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Note
              </Button>
            </div>
          ) : filteredAndSortedNotes.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No notes found
              </h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setFilterBy("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            filteredAndSortedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => router.push(`/App/Notes/notes/${note.id}`)}
                onEdit={() => {
                  setEditingNote(note);
                  setEditNoteTitle(note.title);
                }}
                onDuplicate={() => duplicateNote(note.id)}
                onDelete={() => deleteNote(note.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Edit Note Dialog */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Note</h3>
            <div>
              <Label htmlFor="edit-note-title">Note Title</Label>
              <Input
                id="edit-note-title"
                value={editNoteTitle}
                onChange={(e) => setEditNoteTitle(e.target.value)}
                placeholder="Note title"
                onKeyPress={(e) => e.key === "Enter" && updateNote()}
              />
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingNote(null);
                  setEditNoteTitle("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={updateNote} disabled={!editNoteTitle.trim()}>
                Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Note Dialog */}
      {showNewNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Note</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="note-title">Note Title</Label>
                <Input
                  id="note-title"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Note title (e.g., Client Project, Personal Expenses)"
                  onKeyPress={(e) => e.key === "Enter" && createNote()}
                />
              </div>
              <div>
                <Label htmlFor="customer-select">
                  Assign to Customer (Optional)
                </Label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowNewNote(false)}>
                Cancel
              </Button>
              <Button onClick={createNote} disabled={!newNoteTitle.trim()}>
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
