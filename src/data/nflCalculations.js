
import playerData from './playerStats2026.json'

// Convert CSV strings into numbers before doing calculations.
const num = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const players = playerData.players.filter(
  (player) => player.season_type === 'REG'
)

// Identify each individual game without counting every player
// as a separate game.
const games = new Map()

for (const player of players) {
  if (!player.game_id || !player.team || !player.opponent_team) {
    continue
  }

  if (!games.has(player.game_id)) {
    games.set(player.game_id, {
      id: player.game_id,
      week: num(player.week),
      teams: new Set(),
    })
  }

  games.get(player.game_id).teams.add(player.team)
  games.get(player.game_id).teams.add(player.opponent_team)
}

const allTeams = [...new Set(
  players.flatMap(player => [player.team, player.opponent_team])
)].filter(Boolean).sort()

function calculateTeamStats(team) {
  const teamPlayers = players.filter(player => player.team === team)

  const opponentPlayers = players.filter(
    player => player.opponent_team === team
  )

  const gamesPlayed = [...games.values()].filter(
    game => game.teams.has(team)
  ).length

  const sum = (rows, field) =>
    rows.reduce((total, row) => total + num(row[field]), 0)

  const average = (total) =>
    gamesPlayed ? total / gamesPlayed : 0

  const opponents = [...new Map(
    opponentPlayers.map(player => [
      `${player.game_id}-${player.team}`,
      {
        week: num(player.week),
        team: player.team,
        gameId: player.game_id
      }
    ])
  ).values()].sort((a, b) => a.week - b.week)

  return {
    team,
    gamesPlayed,

    // Offensive production per game
    passing: average(sum(teamPlayers, 'passing_yards')),
    rushing: average(sum(teamPlayers, 'rushing_yards')),
    passTD: average(sum(teamPlayers, 'passing_tds')),
    rushTD: average(sum(teamPlayers, 'rushing_tds')),

    // Opponent production against this defense per game
    passAllowed: average(sum(opponentPlayers, 'passing_yards')),
    rushAllowed: average(sum(opponentPlayers, 'rushing_yards')),
    passTDAllowed: average(sum(opponentPlayers, 'passing_tds')),
    rushTDAllowed: average(sum(opponentPlayers, 'rushing_tds')),

    // Receiving statistics allowed
    targetsAllowed: average(sum(opponentPlayers, 'targets')),
    receptionsAllowed: average(sum(opponentPlayers, 'receptions')),
    receivingYardsAllowed: average(
      sum(opponentPlayers, 'receiving_yards')
    ),
    receivingTDAllowed: average(
      sum(opponentPlayers, 'receiving_tds')
    ),

    opponents
  }
}

export const teamStats = Object.fromEntries(
  allTeams.map(team => [team, calculateTeamStats(team)])
)

export function getTeamStats(team) {
  return teamStats[team] ?? null
}

export function getPlayerGameLogs(playerId) {
  return players
    .filter(player => player.player_id === playerId)
    .sort((a, b) => num(a.week) - num(b.week))
}

export function getPlayersAgainstDefense(team) {
  return players
    .filter(player => player.opponent_team === team)
    .sort((a, b) => num(a.week) - num(b.week))
}

export function getPlayersForTeam(team) {
  return players.filter(player => player.team === team)
}

export const nflSeason = playerData.season
export const nflDataUpdatedAt = playerData.updatedAt
