import { type Size } from "@/lib/design/sizes"
import { cn } from "@/lib/utils"

export type PlayerState = "idle" | "voted" | "eliminated"
export type CrewmateColor = "red" | "blue" | "cyan" | "yellow" | "green" | "purple"

export interface VotingPlayer {
  id: string
  name: string
  color: CrewmateColor
  state: PlayerState
  isYou?: boolean
}

const colorStyles: Record<CrewmateColor, { border: string; glow: string; text: string }> = {
  red: { border: "border-skeld-red", glow: "shadow-[0_0_15px_rgba(220,38,38,0.5)]", text: "text-skeld-red" },
  blue: { border: "border-blue-500", glow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]", text: "text-blue-500" },
  cyan: { border: "border-skeld-cyan", glow: "shadow-[0_0_15px_rgba(34,211,238,0.5)]", text: "text-skeld-cyan" },
  yellow: { border: "border-yellow-400", glow: "shadow-[0_0_15px_rgba(250,204,21,0.5)]", text: "text-yellow-400" },
  green: { border: "border-skeld-green", glow: "shadow-[0_0_15px_rgba(22,163,74,0.5)]", text: "text-skeld-green" },
  purple: { border: "border-purple-500", glow: "shadow-[0_0_15px_rgba(168,85,247,0.5)]", text: "text-purple-500" },
}

export function VotingMotif({
  size = "default",
  players,
  className,
}: {
  size?: Size
  players: VotingPlayer[]
  className?: string
}) {
  return (
    <div
      data-testid="voting-motif"
      data-size={size}
      className={cn(
        "relative mx-auto flex aspect-square w-full max-w-md items-center justify-center p-4",
        "data-[size=projector]:max-w-2xl",
        className
      )}
    >
      {/* Center Circle */}
      <div
        className={cn(
          "absolute z-10 flex h-32 w-32 items-center justify-center rounded-full border-4 border-skeld-red bg-skeld-void p-4 text-center shadow-glow-red",
          "data-[size=projector]:h-48 data-[size=projector]:w-48"
        )}
      >
        <span
          className={cn(
            "font-pixel text-lg leading-tight text-skeld-glow-red",
            "data-[size=projector]:text-2xl"
          )}
        >
          EMERGENCY
          <br />
          MEETING
        </span>
      </div>

      {/* Surrounding Cards */}
      <div className="absolute inset-0">
        {players.map((player, index) => {
          const angle = (index * 360) / Math.max(players.length, 1)
          const radius = size === "projector" ? 40 : 42 // percentage from center
          const top = `${50 - Math.cos((angle * Math.PI) / 180) * radius}%`
          const left = `${50 + Math.sin((angle * Math.PI) / 180) * radius}%`

          const styles = colorStyles[player.color]
          const isVoted = player.state === "voted"
          const isElim = player.state === "eliminated"

          return (
            <div
              key={player.id}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-md border-2 bg-skeld-panel p-2 text-center transition-all",
                "w-20 data-[size=projector]:w-28 data-[size=projector]:p-3",
                isElim ? "opacity-40" : "opacity-90",
                isVoted ? cn(styles.border, styles.glow) : "border-gray-700",
                player.isYou && !isElim && "ring-2 ring-white"
              )}
              style={{ top, left }}
            >
              <div className="relative mx-auto h-8 w-8 data-[size=projector]:h-12 data-[size=projector]:w-12">
                <img
                  src={`/among-us/${player.color}.svg`}
                  alt={`${player.color} crewmate`}
                  className={cn("h-full w-full object-contain", isElim && "grayscale")}
                />
              </div>
              <div
                className={cn(
                  "mt-1 truncate font-rajdhani text-xs font-bold uppercase",
                  "data-[size=projector]:mt-2 data-[size=projector]:text-sm",
                  isElim ? "text-gray-400 line-through" : styles.text
                )}
              >
                {player.name}
              </div>
              {player.isYou && (
                <div className="absolute -right-2 -top-2 rounded bg-white px-1 py-0.5 text-[10px] font-bold leading-none text-black">
                  YOU
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
