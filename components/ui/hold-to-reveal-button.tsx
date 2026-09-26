"use client"

import { useState, useRef, useEffect } from "react"
import { type Size } from "@/lib/design/sizes"
import { cn } from "@/lib/utils"

export function HoldToReveal({
  size = "default",
  duration = 2000,
  children,
  className,
}: {
  size?: Size
  duration?: number
  children: React.ReactNode
  className?: string
}) {
  const [state, setState] = useState<"idle" | "holding" | "revealed" | "released-early">("idle")
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const circleRef = useRef<SVGCircleElement>(null)

  // Set these imperatively via the CSSOM (not a JSX `style` prop) so the
  // markup never carries an inline `style=""` attribute — that attribute
  // form is what CSP's `style-src-attr` blocks, while direct DOM property
  // writes are unaffected by CSP.
  useEffect(() => {
    const circle = circleRef.current
    if (!circle) return
    circle.style.animationDuration = state === "holding" ? `${duration}ms` : ""
    circle.style.strokeDashoffset = state === "holding" ? "0" : "283"
  }, [state, duration])

  const handlePointerDown = () => {
    if (state === "revealed") return
    setState("holding")
    timerRef.current = setTimeout(() => {
      setState("revealed")
    }, duration)
  }

  const handlePointerUpOrLeave = () => {
    if (state === "revealed") return
    if (timerRef.current) clearTimeout(timerRef.current)
    if (state === "holding") {
      setState("released-early")
      setTimeout(() => setState("idle"), 500)
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div
      data-testid="hold-to-reveal"
      data-size={size}
      className={cn("flex flex-col items-center justify-center p-6", className)}
    >
      {state !== "revealed" ? (
        <button
          className={cn(
            "group relative flex aspect-square items-center justify-center rounded-full border-4 border-skeld-red bg-skeld-void p-4 transition-transform active:scale-95",
            "w-32 data-[size=projector]:w-48 data-[size=projector]:p-6"
          )}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUpOrLeave}
          onPointerLeave={handlePointerUpOrLeave}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Progress ring */}
          <svg
            className="absolute inset-0 h-full w-full -rotate-90 text-skeld-glow-red"
            viewBox="0 0 100 100"
          >
            <circle
              ref={circleRef}
              cx="50"
              cy="50"
              r="45"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray="283"
              strokeDashoffset="283"
              className={cn(
                "transition-all",
                state === "holding" && "animate-[spin-ring_linear_forwards]",
                state === "idle" && "duration-300"
              )}
            />
          </svg>
          <span
            className={cn(
              "z-10 text-center font-orbitron text-sm font-bold uppercase leading-tight text-skeld-red group-hover:text-skeld-glow-red",
              "data-[size=projector]:text-lg"
            )}
          >
            Hold To
            <br />
            Reveal
          </span>
        </button>
      ) : (
        <div className="animate-in fade-in zoom-in w-full duration-500">
          {children}
        </div>
      )}
    </div>
  )
}
