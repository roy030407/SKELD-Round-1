import { type Size } from "@/lib/design/sizes"
import { cn } from "@/lib/utils"

export type ButtonVariant = "primary" | "danger" | "ghost"

export function Button({
  size = "default",
  variant = "primary",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: Size
  variant?: ButtonVariant
}) {
  return (
    <button
      data-size={size}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-orbitron text-sm uppercase transition-all duration-200",
        "disabled:opacity-50 disabled:pointer-events-none active:scale-97",
        "data-[size=projector]:text-lg data-[size=projector]:px-8 data-[size=projector]:py-4 px-4 py-2",
        variant === "primary" && "bg-skeld-amber text-skeld-void hover:shadow-glow-amber",
        variant === "danger" && "bg-skeld-red text-white hover:shadow-glow-red",
        variant === "ghost" && "bg-transparent text-skeld-amber border border-skeld-amber hover:bg-skeld-amber/10",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
