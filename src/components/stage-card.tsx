"use client";

import type React from "react";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, CheckCircle2, Circle, Clock, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Stage } from "@/components/Home/HomePage";

interface StageCardProps {
  stage: Stage;
  isFirst: boolean;
  isLast: boolean;
  isCurrent: boolean;
  onToggleTask: (stageId: string, taskId: string) => void;
  onAddTask: (stageId: string, taskTitle: string) => void;
  onDeleteTask: (stageId: string, taskId: string) => void;
  onDeleteStage: (stageId: string) => void;
  onReorderTasks: (stageId: string, draggedTaskId: string, targetTaskId: string) => void;
}

export function StageCard({ stage, isFirst, isLast, isCurrent, onToggleTask, onAddTask, onDeleteTask, onDeleteStage, onReorderTasks }: StageCardProps) {
  const [isOpen, setIsOpen] = useState(stage.status === "in-progress");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [deleteStageOpen, setDeleteStageOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const completedTasks = stage.tasks.filter(t => t.completed).length;
  const totalTasks = stage.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(stage.id, newTaskTitle.trim());
      setNewTaskTitle("");
    }
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (draggedTaskId !== taskId) {
      setDragOverTaskId(taskId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTaskId(null);
  };

  const handleDrop = (targetTaskId: string) => {
    if (draggedTaskId && draggedTaskId !== targetTaskId) {
      onReorderTasks(stage.id, draggedTaskId, targetTaskId);
    }
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const getStatusIcon = () => {
    switch (stage.status) {
      case "completed":
        return <CheckCircle2 className="h-6 w-6 text-success-foreground" />;
      case "in-progress":
        return <Clock className="h-6 w-6 text-primary" />;
      default:
        return <Circle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (stage.status) {
      case "completed":
        return "bg-success";
      case "in-progress":
        return "bg-accent";
      default:
        return "bg-muted";
    }
  };

  const handleDeleteStage = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDeleteStage(stage.id);
    }, 300);
  };

  return (
    <>
      <div className={cn("relative flex gap-6 transition-all duration-300", isDeleting && "opacity-0 scale-95 translate-x-8", "animate-in fade-in slide-in-from-left-4 duration-500")}>
        {/* Timeline node */}
        <div className="max-sm:hidden relative z-10 flex flex-col items-center">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-full border-4 border-background transition-all duration-300", getStatusColor())}>{getStatusIcon()}</div>
        </div>

        {/* Card */}
        <Card className={cn("group/stage flex-1 transition-all duration-300", isCurrent && "ring-2 ring-accent shadow-lg")}>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-2xl font-bold">{stage.title}</CardTitle>
                    <span
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium",
                        stage.status === "completed" && "bg-success/20 text-success-foreground border border-success-foreground/20",
                        stage.status === "in-progress" && "bg-primary/20 text-primary border border-primary/20",
                        stage.status === "upcoming" && "bg-muted text-muted-foreground border border-border/20"
                      )}
                    >
                      {stage.status === "completed" && "Completed"}
                      {stage.status === "in-progress" && "In Progress"}
                      {stage.status === "upcoming" && "Upcoming"}
                    </span>
                  </div>
                  <CardDescription className="text-base">{stage.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group-hover/stage:opacity-100 opacity-0 transition-opacity duration-300 h-9 w-9 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteStageOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete stage</span>
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                      <ChevronDown className={cn("h-5 w-5 transition-transform duration-300 ease-out", isOpen && "rotate-180")} />
                      <span className="sr-only">Toggle stage</span>
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Progress</span>
                  <span className="font-semibold text-foreground">
                    {completedTasks} / {totalTasks} tasks
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardHeader>

            <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <CardContent className="space-y-4 pt-0">
                {/* Task list */}
                <div className="space-y-3">
                  {stage.tasks.map((task, index) => (
                    <div key={task.id} className="group/task relative animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                      {dragOverTaskId === task.id && draggedTaskId !== task.id && (
                        <div className="absolute -top-1.5 left-0 right-0 z-10 h-0.5 bg-accent shadow-[0_0_8px_rgba(168,85,247,0.6)] animate-in fade-in duration-200" />
                      )}
                      <div
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onDragOver={e => handleDragOver(e, task.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(task.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:bg-accent/5",
                          draggedTaskId === task.id && "opacity-40 scale-95",
                          dragOverTaskId === task.id && draggedTaskId !== task.id && "border-accent bg-accent/5",
                          "cursor-move"
                        )}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Checkbox id={task.id} checked={task.completed} onCheckedChange={() => onToggleTask(stage.id, task.id)} className="h-5 w-5" />
                        <label
                          htmlFor={task.id}
                          className={cn(
                            "flex-1 cursor-pointer text-sm font-medium leading-relaxed transition-all duration-200",
                            task.completed ? "text-muted-foreground line-through" : "text-foreground"
                          )}
                        >
                          {task.title}
                        </label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="group-hover/task:opacity-100 opacity-0 h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteTaskId(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete task</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {isAddingTask ? (
                  <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Input
                      placeholder="Enter task title..."
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          handleAddTask();
                        } else if (e.key === "Escape") {
                          setIsAddingTask(false);
                          setNewTaskTitle("");
                        }
                      }}
                      autoFocus
                      className="flex-1"
                    />
                    <Button onClick={handleAddTask} size="sm">
                      Add
                    </Button>
                    <Button
                      onClick={() => {
                        setIsAddingTask(false);
                        setNewTaskTitle("");
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setIsAddingTask(true)} variant="outline" size="sm" className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Add Task
                  </Button>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      <AlertDialog open={deleteStageOpen} onOpenChange={setDeleteStageOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{stage.title}"? This action cannot be undone and will remove all tasks in this stage.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDeleteStage();
                setDeleteStageOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteTaskId !== null} onOpenChange={open => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this task? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTaskId) {
                  onDeleteTask(stage.id, deleteTaskId);
                  setDeleteTaskId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
