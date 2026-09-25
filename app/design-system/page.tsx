import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmergencyBanner } from "@/components/ui/emergency-banner"
import { HoldToReveal } from "@/components/ui/hold-to-reveal-button"
import { Panel } from "@/components/ui/panel"
import { StatusPill } from "@/components/ui/status-pill"
import { TaskRail, type RailTask } from "@/components/ui/task-rail"
import { VotingMotif, type VotingPlayer } from "@/components/ui/voting-motif"
import { HeroTitle } from "@/components/ui/hero-title"

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DESIGN_SYSTEM !== "1") {
    notFound()
  }

  const demoTasks: RailTask[] = [
    { number: 1, name: "Locked Task", status: "locked" },
    { number: 2, name: "Open Task", status: "open" },
    { number: 3, name: "In Progress", status: "in-progress" },
    { number: 4, name: "Completed", status: "complete" },
  ]

  const demoPlayers: VotingPlayer[] = [
    { id: "1", name: "Red", color: "red", state: "idle" },
    { id: "2", name: "Blue", color: "blue", state: "voted" },
    { id: "3", name: "Cyan", color: "cyan", state: "idle", isYou: true },
    { id: "4", name: "Yellow", color: "yellow", state: "eliminated" },
    { id: "5", name: "Green", color: "green", state: "idle" },
    { id: "6", name: "Purple", color: "purple", state: "voted" },
  ]

  return (
    <div className="min-h-screen bg-skeld-void pb-24 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <HeroTitle title="Design System" subtitle="Project Skeld Components" className="mb-16" />

        <div className="grid gap-24">
          <section data-testid="panel-section">
            <h2 className="mb-6 font-orbitron text-sm uppercase text-skeld-amber">Panels</h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <Panel variant="default">Default Panel (Amber border)</Panel>
                <Panel variant="amber">Amber Panel (Solid border)</Panel>
                <Panel variant="red">Red Panel (Danger)</Panel>
              </div>
              <div className="space-y-4">
                <Panel size="projector" variant="default">Projector Panel</Panel>
              </div>
            </div>
          </section>

          <section data-testid="button-section">
            <h2 className="mb-6 font-orbitron text-sm uppercase text-skeld-amber">Buttons</h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="flex flex-wrap gap-4">
                <Button variant="primary">Primary</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>
          </section>

          <section data-testid="pill-section">
            <h2 className="mb-6 font-orbitron text-sm uppercase text-skeld-amber">Status Pills</h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="flex flex-wrap gap-4">
                <StatusPill status="open" />
                <StatusPill status="closed" />
                <StatusPill status="complete" />
              </div>
            </div>
          </section>

          <section data-testid="card-section">
            <h2 className="mb-6 font-orbitron text-sm uppercase text-skeld-amber">Cards</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card accent="red">Red Card</Card>
              <Card accent="cyan">Cyan Card</Card>
            </div>
          </section>

          <section data-testid="task-rail-section">
            <h2 className="mb-6 font-orbitron text-sm uppercase text-skeld-amber">Task Rail</h2>
            <div className="grid gap-8 lg:grid-cols-2">
              <div><TaskRail tasks={demoTasks} /></div>
              <div><TaskRail size="projector" tasks={demoTasks} /></div>
            </div>
          </section>

          <section data-testid="voting-motif-section">
            <h2 className="mb-6 font-orbitron text-sm uppercase text-skeld-amber">Voting Motif</h2>
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-800 bg-gray-900/30 py-8"><VotingMotif players={demoPlayers} /></div>
              <div className="rounded-lg border border-gray-800 bg-gray-900/30 py-8"><VotingMotif size="projector" players={demoPlayers} /></div>
            </div>
          </section>

          <section data-testid="hold-to-reveal-section">
            <h2 className="mb-6 font-orbitron text-sm uppercase text-skeld-amber">Hold To Reveal</h2>
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-lg border border-gray-800 bg-gray-900/30">
                <HoldToReveal duration={2000}>
                  <Panel variant="amber" className="text-center">Revealed Word: IMPOSTER</Panel>
                </HoldToReveal>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
