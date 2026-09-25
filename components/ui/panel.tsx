import { type Size } from "@/lib/design/sizes"
import { cn } from "@/lib/utils"

export type PanelVariant = "default" | "amber" | "red"

export function Panel({
  size = "default",
  variant = "default",
  className,
  children,
}: {
  size?: Size
  variant?: PanelVariant
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-size={size}
      className={cn(
        "rounded-[var(--radius-panel)] border bg-skeld-panel/90 p-4",
        "data-[size=projector]:p-8 data-[size=projector]:text-xl",
        variant === "default" && "border-skeld-amber/80",
        variant === "amber" && "border-skeld-amber",
        variant === "red" && "border-skeld-red",
        className
      )}
    >
      {children}
    </div>
  )
}
