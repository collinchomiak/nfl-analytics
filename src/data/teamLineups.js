
import playerData from './playerStats2026.json'

const POSITIONS = ['QB', 'RB', 'WR', 'TE']

const number = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const regularSeasonPlayers = playerData.players.filter(
  player => player.season_type === 'REG'
)

// Decide how to order players within each position group.
// These are production-based rankings, NOT official depth charts.

const sortingFields = {
  QB: 'passingAttempts',
  RB: 'carries',
  WR: 'targets',
  TE: 'targets'
}

// Calculate season totals for one player.

function calculatePlayerTotals(playerRows) {
  const sum = field =>
    playerRows.reduce(
      (total, row) => total + number(row[field]),
      0
    )

  const gamesPlayed = new Set(
    playerRows.map(row => row.game_id).filter(Boolean)
  ).size

  return {
    gamesPlayed,

    passingAttempts: sum('attempts'),
    completions: sum('completions'),
    passingYards: sum('passing_yards'),
    passingTDs: sum('passing_tds'),
    interceptions: sum('passing_interceptions'),

    carries: sum('carries'),
    rushingYards: sum('rushing_yards'),
    rushingTDs: sum('rushing_tds'),

    targets: sum('targets'),
    receptions: sum('receptions'),
    receivingYards: sum('receiving_yards'),
    receivingTDs: sum('receiving_tds'),

    fantasyPointsPPR: sum('fantasy_points_ppr')
  }
}

// Build all recorded player lineups for one NFL team.

export function getTeamLineup(teamId) {
  const teamPlayers = regularSeasonPlayers.filter(
    player => player.team === teamId &&
      POSITIONS.includes(player.position)
  )

  const playerGroups = new Map()

  for (const player of teamPlayers) {
    const id = player.player_id

    if (!id) continue

    if (!playerGroups.has(id)) {
      playerGroups.set(id, {
        id,
        name: player.player_display_name,
        position: player.position,
        team: teamId,
        headshot: player.headshot_url,
        rows: []
      })
    }

    const group = playerGroups.get(id)
    group.rows.push(player)

    // Prefer the latest available profile information.
    if (player.headshot_url) {
      group.headshot = player.headshot_url
    }
  }

  const players = [...playerGroups.values()].map(player => ({
    id: player.id,
    name: player.name,
    position: player.position,
    team: player.team,
    headshot: player.headshot,
    stats: calculatePlayerTotals(player.rows)
  }))

  return Object.fromEntries(
    POSITIONS.map(position => {
      const sortingField = sortingFields[position]

      const positionPlayers = players
        .filter(player => player.position === position)
        .sort((a, b) => {
          const primaryDifference =
            b.stats[sortingField] - a.stats[sortingField]

          if (primaryDifference !== 0) {
            return primaryDifference
          }

          // Use total PPR production as a tiebreaker.
          const fantasyDifference =
            b.stats.fantasyPointsPPR -
            a.stats.fantasyPointsPPR

          if (fantasyDifference !== 0) {
            return fantasyDifference
          }

          return a.name.localeCompare(b.name)
        })

      return [position, positionPlayers]
    })
  )
}

// Return the first N players at a position, with production labels.
// Example: getPositionLineup('PHI', 'WR', 3).

export function getPositionLineup(teamId, position, limit = 3) {
  const lineup = getTeamLineup(teamId)

  if (!lineup[position]) return []

  return lineup[position]
    .slice(0, limit)
    .map((player, index) => ({
      ...player,
      role: `${position}${index + 1}`
    }))
}

// Retrieve a practical offensive lineup for our dashboard.
// This does not claim to identify official starters.

export function getFantasyLineup(teamId) {
  return {
    QB: getPositionLineup(teamId, 'QB', 2),
    RB: getPositionLineup(teamId, 'RB', 3),
    WR: getPositionLineup(teamId, 'WR', 3),
    TE: getPositionLineup(teamId, 'TE', 2)
  }
}
