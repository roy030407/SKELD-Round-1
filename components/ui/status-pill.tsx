import { type Size } from "@/lib/design/sizes"
import { cn } from "@/lib/utils"

export type PillStatus = "open" | "waiting" | "closed" | "complete"

export function StatusPill({
  size = "default",
  status,
  className,
}: {
  size?: Size
  status: PillStatus
  className?: string
}) {
  return (
    <span
      data-size={size}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-pill)] border px-3 py-1 text-xs font-semibold uppercase tracking-wider",
        "data-[size=projector]:px-4 data-[size=projector]:py-1.5 data-[size=projector]:text-sm",
        status === "open" && "border-skeld-cyan text-skeld-cyan",
        status === "waiting" && "border-skeld-amber text-skeld-amber",
        status === "closed" && "border-skeld-red text-skeld-red",
        status === "complete" && "border-skeld-green text-skeld-green",
        className
      )}
    >
      {status}
    </span>
  )
}
