import { type Size } from "@/lib/design/sizes"
import { cn } from "@/lib/utils"

export type CardAccent = "red" | "blue" | "cyan" | "yellow" | "green" | "purple" | "gold" | "silver" | "bronze" | null

export function Card({
  size = "default",
  accent = null,
  className,
  children,
}: {
  size?: Size
  accent?: CardAccent
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-size={size}
      className={cn(
        "rounded-lg border border-skeld-panel bg-skeld-void/50 p-4 transition-colors",
        "data-[size=projector]:p-6 data-[size=projector]:text-lg",
        accent === "red" && "border-skeld-red/50 hover:border-skeld-red",
        accent === "blue" && "border-blue-500/50 hover:border-blue-500",
        accent === "cyan" && "border-skeld-cyan/50 hover:border-skeld-cyan",
        accent === "yellow" && "border-yellow-400/50 hover:border-yellow-400",
        accent === "green" && "border-skeld-green/50 hover:border-skeld-green",
        accent === "purple" && "border-purple-500/50 hover:border-purple-500",
        accent === "gold" && "border-skeld-gold shadow-glow-amber", // gold uses amber glow for now
        accent === "silver" && "border-skeld-silver",
        accent === "bronze" && "border-skeld-bronze",
        !accent && "hover:border-skeld-amber/50",
        className
      )}
    >
      {children}
    </div>
  )
}
