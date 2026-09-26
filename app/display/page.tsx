'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'

export default function ProjectorDisplayPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard')
      if (res.ok) {
        const data = await res.json()
        setTeams(data.leaderboard || [])
        setLastUpdated(new Date().toLocaleTimeString())
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-24 text-white">
      <EmergencyBanner text="PROJECT SKELD: NAB PROJECTOR LEADERBOARD" size="projector" />

      <div className="mt-8 flex w-full max-w-7xl flex-col gap-8 px-6">
        <Panel size="projector" variant="amber" className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b-2 border-skeld-amber/40 pb-4">
            <div>
              <h1 className="font-orbitron text-4xl font-extrabold uppercase tracking-wide text-skeld-amber">
                ROUND 1 LIVE RANKINGS
              </h1>
              <p className="mt-1 font-rajdhani text-2xl text-skeld-cyan">
                TOP 8 TEAMS QUALIFY FOR ROUND 2 (PHYSICAL AMONG US GAME)
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xl text-gray-400">UPDATED: {lastUpdated || 'SYNCING...'}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-rajdhani text-2xl">
              <thead>
                <tr className="border-b-2 border-skeld-panel text-lg font-orbitron uppercase text-gray-400">
                  <th className="py-4 px-4">RANK</th>
                  <th className="py-4 px-4">CREW / TEAM</th>
                  <th className="py-4 px-4 text-center">T1</th>
                  <th className="py-4 px-4 text-center">T2</th>
                  <th className="py-4 px-4 text-center">T3</th>
                  <th className="py-4 px-4 text-center">T4</th>
                  <th className="py-4 px-4 text-center">BET</th>
                  <th className="py-4 px-4 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-skeld-panel/60">
                {teams.slice(0, 12).map((t) => {
                  const isTop8 = t.rank <= 8
                  const isTop3 = t.rank <= 3
                  return (
                    <tr
                      key={t.teamId}
                      className={`transition-colors ${
                        isTop3
                          ? 'bg-skeld-amber/15 font-bold'
                          : isTop8
                          ? 'bg-skeld-panel/40'
                          : ''
                      }`}
                    >
                      <td className="py-4 px-4 font-mono font-bold">
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-xl ${
                            t.rank === 1
                              ? 'bg-skeld-gold text-skeld-void shadow-glow-amber'
                              : t.rank === 2
                              ? 'bg-skeld-silver text-skeld-void'
                              : t.rank === 3
                              ? 'bg-skeld-bronze text-white'
                              : 'text-gray-300'
                          }`}
                        >
                          {t.rank}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-white text-3xl">{t.teamName}</span>
                          <span className="font-mono text-lg text-gray-400">({t.teamCode})</span>
                          {isTop8 && (
                            <span className="rounded bg-skeld-cyan/20 border border-skeld-cyan px-2 py-0.5 font-orbitron text-xs text-skeld-cyan">
                              ★ ROUND 2 QUALIFIED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-2xl">{t.task1Points}</td>
                      <td className="py-4 px-4 text-center font-mono text-2xl">{t.task2Points}</td>
                      <td className="py-4 px-4 text-center font-mono text-2xl">{t.task3Points}</td>
                      <td className="py-4 px-4 text-center font-mono text-2xl">{t.task4Points}</td>
                      <td className="py-4 px-4 text-center font-mono text-2xl">
                        {t.betBonus > 0 ? `+${t.betBonus}` : t.betBonus}
                      </td>
                      <td className="py-4 px-4 text-right font-orbitron text-4xl font-extrabold text-skeld-amber">
                        {t.totalPoints}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </main>
  )
}
