import { type Size } from "@/lib/design/sizes"
import { cn } from "@/lib/utils"

export function NavPill({
  active,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}) {
  return (
    <button
      className={cn(
        "rounded-full px-4 py-1.5 font-rajdhani text-sm font-medium transition-colors",
        active
          ? "bg-skeld-cyan text-skeld-void"
          : "bg-transparent text-skeld-cyan hover:bg-skeld-cyan/10",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
