import { type Size } from "@/lib/design/sizes"
import { cn } from "@/lib/utils"

export function HeroTitle({
  title,
  subtitle,
  size = "default",
  className,
}: {
  title: string
  subtitle?: string
  size?: Size
  className?: string
}) {
  return (
    <div data-size={size} className={cn("flex flex-col items-center text-center", className)}>
      <h1
        className={cn(
          "font-orbitron text-4xl font-bold tracking-tight text-white drop-shadow-md",
          "data-[size=projector]:text-6xl"
        )}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={cn(
            "mt-2 font-rajdhani text-lg text-skeld-cyan",
            "data-[size=projector]:text-2xl data-[size=projector]:mt-4"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
