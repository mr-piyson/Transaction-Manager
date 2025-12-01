"use client"

import { useState, useEffect, useRef } from "react"
import { StageCard } from "@/components/stage-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import useSWR from "swr"
import { CreateStageDialog } from "@/components/Dialogs/create-stage-dialog"
import { StickyHeader, StickyHeaderText } from "@/components/StickyHeader"

export interface Task {
  id: string
  title: string
  completed: boolean
}

export interface Stage {
  id: string
  title: string
  description: string
  tasks: Task[]
  status: "completed" | "in-progress" | "upcoming"
}

const initialStages: Stage[] = [
  {
    id: "1",
    title: "Project Setup",
    description: "Initialize project structure and dependencies",
    status: "completed",
    tasks: [
      { id: "1-1", title: "Create Next.js project", completed: true },
      { id: "1-2", title: "Setup Tailwind CSS", completed: true },
      { id: "1-3", title: "Configure TypeScript", completed: true },
      { id: "1-4", title: "Setup Git repository", completed: true },
    ],
  },
  {
    id: "2",
    title: "Design System",
    description: "Build reusable UI components and design tokens",
    status: "in-progress",
    tasks: [
      { id: "2-1", title: "Define color palette", completed: true },
      { id: "2-2", title: "Create button components", completed: true },
      { id: "2-3", title: "Build form components", completed: false },
      { id: "2-4", title: "Setup typography system", completed: false },
    ],
  },
  {
    id: "3",
    title: "Authentication",
    description: "Implement user authentication and authorization",
    status: "upcoming",
    tasks: [
      { id: "3-1", title: "Setup auth provider", completed: false },
      { id: "3-2", title: "Create login page", completed: false },
      { id: "3-3", title: "Create signup page", completed: false },
      { id: "3-4", title: "Implement protected routes", completed: false },
    ],
  },
  {
    id: "4",
    title: "Database Integration",
    description: "Connect and configure database",
    status: "upcoming",
    tasks: [
      { id: "4-1", title: "Setup database connection", completed: false },
      { id: "4-2", title: "Create database schema", completed: false },
      { id: "4-3", title: "Setup migrations", completed: false },
    ],
  },
]

export default function DevelopmentProgressPage() {
  const { data: stages = initialStages, mutate } = useSWR<Stage[]>("stages", null, {
    fallbackData: initialStages,
  })

  const [currentStageId, setCurrentStageId] = useState<string>("")
  const stageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  useEffect(() => {
    const inProgressStage = stages.find((s) => s.status === "in-progress")
    if (inProgressStage) {
      setCurrentStageId(inProgressStage.id)
    }
  }, [stages])

  useEffect(() => {
    if (currentStageId && stageRefs.current[currentStageId]) {
      setTimeout(() => {
        stageRefs.current[currentStageId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      }, 100)
    }
  }, [currentStageId])

  const handleToggleTask = (stageId: string, taskId: string) => {
    const updatedStages = stages.map((stage) => {
      if (stage.id === stageId) {
        const updatedTasks = stage.tasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task,
        )
        const completedCount = updatedTasks.filter((t) => t.completed).length
        const totalCount = updatedTasks.length

        let newStatus: Stage["status"] = "upcoming"
        if (completedCount === totalCount) {
          newStatus = "completed"
        } else if (completedCount > 0) {
          newStatus = "in-progress"
        }

        return { ...stage, tasks: updatedTasks, status: newStatus }
      }
      return stage
    })

    mutate(updatedStages, false)
  }

  const handleAddTask = (stageId: string, taskTitle: string) => {
    const updatedStages = stages.map((stage) => {
      if (stage.id === stageId) {
        const newTask: Task = {
          id: `${stageId}-${Date.now()}`,
          title: taskTitle,
          completed: false,
        }
        return { ...stage, tasks: [...stage.tasks, newTask] }
      }
      return stage
    })

    mutate(updatedStages, false)
  }

  const handleDeleteTask = (stageId: string, taskId: string) => {
    const updatedStages = stages.map((stage) => {
      if (stage.id === stageId) {
        const updatedTasks = stage.tasks.filter((task) => task.id !== taskId)
        const completedCount = updatedTasks.filter((t) => t.completed).length
        const totalCount = updatedTasks.length

        let newStatus: Stage["status"] = "upcoming"
        if (totalCount === 0) {
          newStatus = "upcoming"
        } else if (completedCount === totalCount) {
          newStatus = "completed"
        } else if (completedCount > 0) {
          newStatus = "in-progress"
        }

        return { ...stage, tasks: updatedTasks, status: newStatus }
      }
      return stage
    })

    mutate(updatedStages, false)
  }

  const handleDeleteStage = (stageId: string) => {
    const updatedStages = stages.filter((stage) => stage.id !== stageId)
    mutate(updatedStages, false)
  }

  const handleReorderTasks = (stageId: string, draggedTaskId: string, targetTaskId: string) => {
    const updatedStages = stages.map((stage) => {
      if (stage.id === stageId) {
        const tasks = [...stage.tasks]
        const draggedIndex = tasks.findIndex((t) => t.id === draggedTaskId)
        const targetIndex = tasks.findIndex((t) => t.id === targetTaskId)

        if (draggedIndex !== -1 && targetIndex !== -1) {
          const [draggedTask] = tasks.splice(draggedIndex, 1)
          tasks.splice(targetIndex, 0, draggedTask)
        }

        return { ...stage, tasks }
      }
      return stage
    })

    mutate(updatedStages, false)
  }

  const handleCreateStage = (title: string, description: string) => {
    const newStage: Stage = {
      id: Date.now().toString(),
      title,
      description,
      status: "upcoming",
      tasks: [],
    }

    mutate([...stages, newStage], false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div  className="mx-auto px-2">
    {/* add glassmorphism */}
        <StickyHeader className="mb-10 bg-background/70 backdrop-blur-md  ">
            <StickyHeaderText isSticky={true} className="text-center">
              Development Progress
            </StickyHeaderText>
          <CreateStageDialog onCreateStage={handleCreateStage}>
            <Button size="sm" className="gap-2">
              <Plus className="h-5 w-5" />
              <span className="max-sm:hidden">New Stage</span>
            </Button>
          </CreateStageDialog>
        </StickyHeader>

        <div className="relative mx-auto container space-y-8">
          {/* Vertical timeline line */}
          <div className="max-sm:hidden absolute left-6 top-8 bottom-8 w-0.5 bg-border" />

          {stages.map((stage, index) => (
            <div
              key={stage.id}
              ref={(el) => {
                stageRefs.current[stage.id] = el
              }}
            >
              <StageCard
                stage={stage}
                isFirst={index === 0}
                isLast={index === stages.length - 1}
                isCurrent={stage.id === currentStageId}
                onToggleTask={handleToggleTask}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                onDeleteStage={handleDeleteStage}
                onReorderTasks={handleReorderTasks}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}



