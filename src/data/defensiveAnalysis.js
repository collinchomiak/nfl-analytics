
import playerData from './playerStats2026.json'

const number = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const players = playerData.players.filter(
  player => player.season_type === 'REG'
)

function sum(rows, field) {
  return rows.reduce(
    (total, player) => total + number(player[field]),
    0
  )
}

// Organize players by activity, not just listed position.
// A running back can appear under rushing AND receiving.
// A receiver attempting a trick-play pass can appear under passing.

function organizePlayers(gamePlayers) {
  const passing = gamePlayers
    .filter(player => number(player.attempts) > 0)
    .map(player => ({
      id: player.player_id,
      name: player.player_display_name,
      position: player.position,
      headshot: player.headshot_url,
      attempts: number(player.attempts),
      completions: number(player.completions),
      yards: number(player.passing_yards),
      touchdowns: number(player.passing_tds),
      interceptions: number(player.passing_interceptions)
    }))
    .sort((a, b) => b.yards - a.yards)

  const rushing = gamePlayers
    .filter(player => number(player.carries) > 0)
    .map(player => ({
      id: player.player_id,
      name: player.player_display_name,
      position: player.position,
      headshot: player.headshot_url,
      carries: number(player.carries),
      yards: number(player.rushing_yards),
      touchdowns: number(player.rushing_tds)
    }))
    .sort((a, b) => b.yards - a.yards)

  const receiving = gamePlayers
    .filter(player =>
      number(player.targets) > 0 ||
      number(player.receptions) > 0
    )
    .map(player => ({
      id: player.player_id,
      name: player.player_display_name,
      position: player.position,
      headshot: player.headshot_url,
      targets: number(player.targets),
      receptions: number(player.receptions),
      yards: number(player.receiving_yards),
      touchdowns: number(player.receiving_tds)
    }))
    .sort((a, b) => b.yards - a.yards)

  return { passing, rushing, receiving }
}

// Get every recorded game against a selected defense.

export function getDefensiveGameLogs(defensiveTeam) {
  const matchingPlayers = players.filter(
    player => player.opponent_team === defensiveTeam
  )

  const games = new Map()

  for (const player of matchingPlayers) {
    if (!player.game_id) continue

    if (!games.has(player.game_id)) {
      games.set(player.game_id, {
        gameId: player.game_id,
        week: number(player.week),
        opponent: player.team,
        playerRows: []
      })
    }

    games.get(player.game_id).playerRows.push(player)
  }

  return [...games.values()]
    .map(game => ({
      gameId: game.gameId,
      week: game.week,
      opponent: game.opponent,
      totals: {
        passingYards: sum(game.playerRows, 'passing_yards'),
        passingTDs: sum(game.playerRows, 'passing_tds'),
        rushingYards: sum(game.playerRows, 'rushing_yards'),
        rushingTDs: sum(game.playerRows, 'rushing_tds'),
        receivingYards: sum(game.playerRows, 'receiving_yards'),
        receivingTDs: sum(game.playerRows, 'receiving_tds'),
        targets: sum(game.playerRows, 'targets'),
        receptions: sum(game.playerRows, 'receptions')
      },
      players: organizePlayers(game.playerRows)
    }))
    .sort((a, b) => a.week - b.week)
}

// Calculate defense-wide averages from individual game totals.

export function getDefensiveSummary(defensiveTeam) {
  const games = getDefensiveGameLogs(defensiveTeam)
  const count = games.length

  if (!count) {
    return {
      team: defensiveTeam,
      gamesPlayed: 0,
      games: [],
      averages: null
    }
  }

  const average = field =>
    games.reduce(
      (total, game) => total + game.totals[field],
      0
    ) / count

  return {
    team: defensiveTeam,
    gamesPlayed: count,
    games,
    averages: {
      passingYards: average('passingYards'),
      passingTDs: average('passingTDs'),
      rushingYards: average('rushingYards'),
      rushingTDs: average('rushingTDs'),
      receivingYards: average('receivingYards'),
      receivingTDs: average('receivingTDs'),
      targets: average('targets'),
      receptions: average('receptions')
    }
  }
}
