import { type Size } from "@/lib/design/sizes"
import { cn } from "@/lib/utils"
import { StatusPill } from "./status-pill"

export type TaskStatus = "locked" | "open" | "in-progress" | "complete"

export interface RailTask {
  number: number
  name: string
  status: TaskStatus
}

export function TaskRail({
  size = "default",
  tasks,
  className,
}: {
  size?: Size
  tasks: RailTask[]
  className?: string
}) {
  const getTaskColor = (index: number) => {
    switch (index % 4) {
      case 0: return "border-skeld-red text-skeld-red"
      case 1: return "border-skeld-cyan text-skeld-cyan"
      case 2: return "border-skeld-green text-skeld-green"
      case 3: return "border-skeld-amber text-skeld-amber"
      default: return "border-gray-500 text-gray-500"
    }
  }

  return (
    <div data-testid="task-rail" data-size={size} className={cn("flex flex-col gap-3", className)}>
      {tasks.map((task, index) => {
        const isLocked = task.status === "locked"
        const isComplete = task.status === "complete"
        const isInProgress = task.status === "in-progress"
        const isOpen = task.status === "open"
        const colorClass = isLocked ? "border-gray-700 text-gray-500" : getTaskColor(index)

        return (
          <div
            key={task.number}
            className={cn(
              "flex items-center gap-4 rounded-r-md border-l-4 bg-skeld-panel/50 p-3 transition-colors",
              "data-[size=projector]:p-5 data-[size=projector]:gap-6 data-[size=projector]:border-l-8",
              colorClass,
              (isOpen || isInProgress) && "bg-skeld-panel border-l-current",
              isComplete && "opacity-75"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-orbitron font-bold",
                "data-[size=projector]:h-12 data-[size=projector]:w-12 data-[size=projector]:text-xl data-[size=projector]:border-4",
                isLocked ? "border-gray-700 text-gray-600" : "border-current text-current",
                isInProgress && "animate-pulse"
              )}
            >
              {isComplete ? "✓" : task.number}
            </div>
            
            <div className="flex-1">
              <h3
                className={cn(
                  "font-rajdhani text-lg font-bold tracking-wide",
                  "data-[size=projector]:text-2xl",
                  isLocked ? "text-gray-500" : "text-white"
                )}
              >
                {task.name}
              </h3>
            </div>

            <StatusPill size={size} status={isLocked ? "closed" : task.status} />
          </div>
        )
      })}
    </div>
  )
}
