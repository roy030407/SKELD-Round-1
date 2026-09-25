'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { StatusPill } from '@/components/ui/status-pill'
import Link from 'next/link'

export default function LeaderboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
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
      <EmergencyBanner text="MISSION STANDINGS: NAB AUDITORIUM" />

      <div className="mt-8 flex w-full max-w-4xl flex-col gap-6 px-4">
        {loading ? (
          <div className="py-24 text-center font-orbitron animate-pulse text-skeld-cyan">
            Interrogating Mission Ledger...
          </div>
        ) : data?.hiddenForPlayers ? (
          /* PERSONAL DEVICE VIEW: Concurrently hides competitor rankings */
          <div className="flex flex-col gap-6">
            <Panel variant="red" className="flex flex-col items-center gap-4 text-center py-8">
              <span className="text-5xl">🔒</span>
              <h1 className="font-orbitron text-2xl font-bold tracking-wider text-skeld-glow-red">
                CLASSIFIED AUDITORIUM BROADCAST
              </h1>
              <p className="max-w-xl font-rajdhani text-lg text-gray-300">
                To preserve competitive tension and tactical gameplay, live rankings and qualification cutoffs
                are displayed <strong>exclusively on the Main NAB Auditorium Projector Screen</strong>.
              </p>
              <div className="rounded border border-skeld-amber/40 bg-skeld-amber/10 px-6 py-3 font-mono text-sm text-skeld-amber">
                DIRECT YOUR ATTENTION TO THE MAIN NAB STAGE PROJECTOR
              </div>
            </Panel>

            {data?.myTeam ? (
              <Panel variant="default" className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-skeld-cyan/30 pb-3">
                  <div>
                    <span className="font-orbitron text-xs text-skeld-cyan uppercase tracking-wider">
                      Your Team Telemetry
                    </span>
                    <h2 className="font-orbitron text-xl font-bold text-white">
                      {data.myTeam.teamCode} — {data.myTeam.teamName}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="font-orbitron text-xs text-gray-400">TOTAL SCORE</span>
                    <div className="font-orbitron text-2xl font-black text-skeld-cyan">
                      {data.myTeam.totalPoints} PTS
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                  <div className="rounded border border-white/10 bg-black/40 p-3 text-center">
                    <div className="font-mono text-xs text-gray-400">R1: QUIZ</div>
                    <div className="font-orbitron text-lg font-bold text-white">
                      {data.myTeam.task1Points}
                    </div>
                  </div>
                  <div className="rounded border border-white/10 bg-black/40 p-3 text-center">
                    <div className="font-mono text-xs text-gray-400">R2: CIPHER</div>
                    <div className="font-orbitron text-lg font-bold text-white">
                      {data.myTeam.task2Points}
                    </div>
                  </div>
                  <div className="rounded border border-white/10 bg-black/40 p-3 text-center">
                    <div className="font-mono text-xs text-gray-400">R3: DEFUSAL</div>
                    <div className="font-orbitron text-lg font-bold text-white">
                      {data.myTeam.task3Points}
                    </div>
                  </div>
                  <div className="rounded border border-white/10 bg-black/40 p-3 text-center">
                    <div className="font-mono text-xs text-gray-400">R4: SHUFFLE</div>
                    <div className="font-orbitron text-lg font-bold text-white">
                      {data.myTeam.task4Points}
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 rounded border border-white/10 bg-black/40 p-3 text-center">
                    <div className="font-mono text-xs text-gray-400">BET BONUS</div>
                    <div className={`font-orbitron text-lg font-bold ${
                      data.myTeam.betBonus > 0
                        ? 'text-skeld-green'
                        : data.myTeam.betBonus < 0
                        ? 'text-skeld-glow-red'
                        : 'text-gray-400'
                    }`}>
                      {data.myTeam.betBonus > 0 ? `+${data.myTeam.betBonus}` : data.myTeam.betBonus}
                    </div>
                  </div>
                </div>
              </Panel>
            ) : (
              <div className="text-center font-rajdhani text-gray-400">
                Log in as a registered crewmate to view your team's confidential telemetry.
              </div>
            )}
          </div>
        ) : (
          /* STAFF / PROJECTOR LEADERBOARD TABLE */
          <Panel variant="amber" className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-skeld-amber/30 pb-3">
              <div>
                <h1 className="font-orbitron text-xl font-bold text-skeld-amber">
                  Official Skeld Standings
                </h1>
                <p className="font-rajdhani text-xs text-gray-400">
                  Top 8 teams advance to Round 2 (Physical Among Us Game).
                </p>
              </div>
              <StatusPill status="open" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-rajdhani text-sm">
                <thead>
                  <tr className="border-b border-skeld-panel text-xs font-orbitron uppercase text-gray-400">
                    <th className="py-3 px-3">RANK</th>
                    <th className="py-3 px-3">CREW / TEAM</th>
                    <th className="py-3 px-2 text-center">R1: QUIZ</th>
                    <th className="py-3 px-2 text-center">R2: CIPHER</th>
                    <th className="py-3 px-2 text-center">R3: DEFUSAL</th>
                    <th className="py-3 px-2 text-center">R4: SHUFFLE</th>
                    <th className="py-3 px-2 text-center">BET</th>
                    <th className="py-3 px-3 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(data?.leaderboard || []).map((team: any) => {
                    const isTop8 = team.rank <= 8
                    return (
                      <tr
                        key={team.teamId}
                        className={`transition-colors hover:bg-white/5 ${
                          isTop8 ? 'bg-skeld-green/10' : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-orbitron font-bold">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                            team.rank === 1
                              ? 'bg-skeld-amber text-black font-black'
                              : isTop8
                              ? 'bg-skeld-green/30 text-skeld-green'
                              : 'text-gray-400'
                          }`}>
                            #{team.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-orbitron font-bold text-white">{team.teamCode}</div>
                          <div className="font-rajdhani text-xs text-gray-400">{team.teamName}</div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono">{team.task1Points}</td>
                        <td className="py-3 px-2 text-center font-mono">{team.task2Points}</td>
                        <td className="py-3 px-2 text-center font-mono">{team.task3Points}</td>
                        <td className="py-3 px-2 text-center font-mono">{team.task4Points}</td>
                        <td className="py-3 px-2 text-center font-mono">
                          {team.betBonus > 0 ? (
                            <span className="text-skeld-green font-bold">+{team.betBonus}</span>
                          ) : team.betBonus < 0 ? (
                            <span className="text-skeld-glow-red font-bold">{team.betBonus}</span>
                          ) : (
                            <span className="text-gray-500">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-orbitron text-base font-bold text-skeld-cyan">
                          {team.totalPoints}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        <div className="mt-4 flex justify-center">
          <Link
            href="/player"
            className="font-rajdhani text-sm text-gray-400 hover:text-skeld-cyan"
          >
            ← Return to Crew Command Hub
          </Link>
        </div>
      </div>
    </main>
  )
}
