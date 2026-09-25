import { type Size } from "@/lib/design/sizes"
import { cn } from "@/lib/utils"

export function EmergencyBanner({
  size = "default",
  text = "EMERGENCY MEETING",
  className,
}: {
  size?: Size
  text?: string
  className?: string
}) {
  return (
    <div
      data-size={size}
      className={cn(
        "flex w-full items-center justify-center border-y-2 border-skeld-red bg-skeld-red/20 py-2",
        "data-[size=projector]:py-4",
        className
      )}
    >
      <h2
        className={cn(
          "font-bangers text-3xl tracking-widest text-skeld-glow-red animate-[pulse-glow_2s_ease-in-out_infinite]",
          "data-[size=projector]:text-5xl"
        )}
      >
        {text}
      </h2>
    </div>
  )
}
