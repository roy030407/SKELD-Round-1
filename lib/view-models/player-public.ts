export function toPublicPlayer(player: any) {
  return {
    id: player.id,
    firstName: player.firstName,
    teamId: player.teamId,
    playerCode: player.playerCode,
    role: player.isLeader ? 'leader' : 'player'
  }
}

export function toAdminPlayer(player: any) {
  return player // return full row
}
