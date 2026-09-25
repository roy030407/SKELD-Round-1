import { type Size } from "@/lib/design/sizes"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

export function InfoCard({
  icon,
  label,
  value,
  size = "default",
  className,
}: {
  icon?: ReactNode
  label: string
  value: ReactNode
  size?: Size
  className?: string
}) {
  return (
    <div
      data-size={size}
      className={cn(
        "flex flex-col items-start rounded-md border border-skeld-amber/30 bg-skeld-panel p-3",
        "data-[size=projector]:p-5",
        className
      )}
    >
      <div className="flex items-center gap-2 text-skeld-amber/80">
        {icon && <span className="h-4 w-4">{icon}</span>}
        <span className="font-orbitron text-xs uppercase tracking-wider data-[size=projector]:text-sm">{label}</span>
      </div>
      <div className="mt-1 font-rajdhani text-lg font-medium text-white data-[size=projector]:text-xl">{value}</div>
    </div>
  )
}
