import Link from "next/link"
import { Button } from "@/components/ui/button"
import { EmergencyBanner } from "@/components/ui/emergency-banner"
import { HeroTitle } from "@/components/ui/hero-title"
import { InfoCard } from "@/components/ui/info-card"
import { Panel } from "@/components/ui/panel"
import { TaskRail, type RailTask } from "@/components/ui/task-rail"
import { HoldToReveal } from "@/components/ui/hold-to-reveal-button"
import { StatusPill } from "@/components/ui/status-pill"
import { Card } from "@/components/ui/card"

const tasks: RailTask[] = [
  { number: 1, name: "Quiz & Betting", status: "locked" },
  { number: 2, name: "Cipher Puzzle", status: "locked" },
  { number: 3, name: "Bomb Defusal", status: "locked" },
  { number: 4, name: "Imposter Shuffle", status: "locked" },
]

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20">
      <EmergencyBanner text="ROUND 1: AMONG US" />
      
      {/* Floating Crewmates (Hero) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-50">
        <img
          src="/among-us/red.svg"
          data-testid="crewmate"
          alt=""
          className="absolute left-[10%] top-[20%] h-24 w-24 animate-[float-crew_4s_ease-in-out_infinite]"
        />
        <img
          src="/among-us/cyan.svg"
          data-testid="crewmate"
          alt=""
          className="absolute right-[15%] top-[15%] h-20 w-20 animate-[float-crew_3.5s_ease-in-out_infinite_0.5s]"
        />
        <img
          src="/among-us/yellow.svg"
          data-testid="crewmate"
          alt=""
          className="absolute left-[20%] top-[60%] h-32 w-32 animate-[float-crew_5s_ease-in-out_infinite_1s]"
        />
      </div>

      <div className="z-10 mt-16 flex w-full max-w-4xl flex-col items-center gap-16 px-4">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center">
          <HeroTitle title="Project Skeld" subtitle="Round 1 Recruitment Event" />
          <p className="mt-6 font-rajdhani text-xl text-gray-300">
            26 September · 5 PM · NAB
          </p>
          <div className="mt-8">
            <Link href="/check-in">
              <Button size="default" variant="primary">Check In</Button>
            </Link>
          </div>
        </section>

        {/* Mission Briefing */}
        <section className="w-full">
          <Panel variant="amber" className="relative mt-4">
            <div className="absolute -top-3 left-4 bg-skeld-void px-2">
              <span className="font-orbitron text-xs font-bold text-skeld-amber">MISSION BRIEFING</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <InfoCard label="Event Type" value="Imposter Game" />
              <InfoCard label="Teams" value="6 Players" />
              <InfoCard label="Tasks" value="4 Stages" />
              <InfoCard label="Venue" value="NAB" />
            </div>
            <p className="mt-6 font-rajdhani text-sm text-gray-300">
              Welcome to Project Skeld. Form your crew, root out the imposters, and complete your tasks before time runs out. The top 8 teams will advance to Round 2.
            </p>
          </Panel>
        </section>

        {/* Mission Stages */}
        <section className="w-full">
          <HeroTitle title="Mission Stages" size="default" className="mb-8" />
          <TaskRail tasks={tasks} />
        </section>

        {/* Check In CTA */}
        <section className="w-full max-w-sm">
          <HoldToReveal duration={1500}>
            <Panel className="flex flex-col items-center gap-4 text-center">
              <StatusPill status="open" />
              <h3 className="font-rajdhani text-xl font-bold text-white">System Unlocked</h3>
              <Link href="/check-in" className="w-full">
                <Button variant="danger" className="w-full">Proceed to Check In</Button>
              </Link>
            </Panel>
          </HoldToReveal>
        </section>

        {/* Footer / Comms */}
        <section className="w-full pb-12 text-center">
          <HeroTitle title="Communications" size="default" className="mb-8" />
          <div className="grid gap-4 md:grid-cols-2">
            <Card accent="cyan" className="flex flex-col items-center justify-center p-6 text-center">
              <span className="font-orbitron text-sm text-gray-400">COORDINATOR</span>
              <h4 className="mt-2 font-rajdhani text-xl font-bold text-white">Admin Team</h4>
            </Card>
            <Card accent="red" className="flex flex-col items-center justify-center p-6 text-center">
              <span className="font-orbitron text-sm text-gray-400">EMERGENCY</span>
              <h4 className="mt-2 font-rajdhani text-xl font-bold text-white">Help Desk</h4>
            </Card>
          </div>
          <div className="mt-16 flex flex-col items-center gap-4 opacity-50">
            <span className="font-orbitron text-xs tracking-widest text-gray-400">ROBOTICS CLUB NIT WARANGAL</span>
          </div>
        </section>
      </div>
    </main>
  )
}
