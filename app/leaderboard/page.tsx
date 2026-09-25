'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { StatusPill } from '@/components/ui/status-pill'
import Link from 'next/link'

export default function LeaderboardPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard')
      if (res.ok) {
        const data = await res.json()
        setTeams(data.leaderboard || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 4000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="OFFICIAL LEADERBOARD" />

      <div className="mt-8 flex w-full max-w-4xl flex-col gap-6 px-4">
        <Panel variant="amber" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-skeld-amber/30 pb-3">
            <div>
              <h1 className="font-orbitron text-xl font-bold text-skeld-amber">
                Project Skeld Standings
              </h1>
              <p className="font-rajdhani text-xs text-gray-400">
                Top 8 teams advance to Round 2 (Physical Among Us Game).
              </p>
            </div>
            <StatusPill status="open" />
          </div>

          {loading ? (
            <div className="py-12 text-center font-orbitron animate-pulse text-skeld-cyan">
              Computing Server Ledger...
            </div>
          ) : teams.length === 0 ? (
            <div className="py-12 text-center font-rajdhani text-gray-400">
              No scores recorded yet. Check in to begin Task 1!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-rajdhani">
                <thead>
                  <tr className="border-b border-skeld-panel text-xs uppercase font-orbitron text-gray-400">
                    <th className="py-3 px-2">Rank</th>
                    <th className="py-3 px-2">Team</th>
                    <th className="py-3 px-2 text-center">T1</th>
                    <th className="py-3 px-2 text-center">T2</th>
                    <th className="py-3 px-2 text-center">T3</th>
                    <th className="py-3 px-2 text-center">T4</th>
                    <th className="py-3 px-2 text-center">Bet</th>
                    <th className="py-3 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-skeld-panel/40">
                  {teams.map((t, idx) => {
                    const isTop8 = t.rank <= 8
                    const isTop3 = t.rank <= 3
                    return (
                      <tr
                        key={t.teamId}
                        className={`transition-colors ${
                          isTop3
                            ? 'bg-skeld-amber/10 font-bold'
                            : isTop8
                            ? 'bg-skeld-panel/30'
                            : 'hover:bg-skeld-panel/20'
                        }`}
                      >
                        <td className="py-3 px-2 font-mono">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                              t.rank === 1
                                ? 'bg-skeld-gold text-skeld-void font-bold shadow-glow-amber'
                                : t.rank === 2
                                ? 'bg-skeld-silver text-skeld-void font-bold'
                                : t.rank === 3
                                ? 'bg-skeld-bronze text-white font-bold'
                                : 'text-gray-400'
                            }`}
                          >
                            {t.rank}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{t.teamName}</span>
                            <span className="font-mono text-xs text-gray-400">
                              {t.teamCode} {isTop8 && <span className="text-skeld-cyan">★ R2 QUALIFIED</span>}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono">{t.task1Points}</td>
                        <td className="py-3 px-2 text-center font-mono">{t.task2Points}</td>
                        <td className="py-3 px-2 text-center font-mono">{t.task3Points}</td>
                        <td className="py-3 px-2 text-center font-mono">{t.task4Points}</td>
                        <td className="py-3 px-2 text-center font-mono">
                          {t.betBonus > 0 ? `+${t.betBonus}` : t.betBonus}
                        </td>
                        <td className="py-3 px-2 text-right font-orbitron text-lg font-bold text-skeld-amber">
                          {t.totalPoints}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex justify-between pt-2 text-xs">
            <Link href="/" className="text-gray-400 hover:underline">
              ← Landing Page
            </Link>
            <Link href="/display" className="text-skeld-cyan hover:underline">
              Open Projector View →
            </Link>
          </div>
        </Panel>
      </div>
    </main>
  )
}
