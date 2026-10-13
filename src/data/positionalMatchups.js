
import playerData from './playerStats2026.json'
import { teamStats } from './nflCalculations'

const POSITIONS = ['QB', 'RB', 'WR', 'TE']

const number = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const regularSeasonPlayers = playerData.players.filter(
  player => player.season_type === 'REG'
)

// Our locked-in traffic light colors.
// Rank 1 = fewest PPR points allowed (toughest matchup).
// Rank 32 = most PPR points allowed (easiest matchup).
const matchupTiers = [
  { maxRank: 12, label: 'Tough', color: '#EF5350' },
  { maxRank: 18, label: 'Below Average', color: '#F59E42' },
  { maxRank: 24, label: 'Favorable', color: '#E6CB55' },
  { maxRank: 32, label: 'Excellent', color: '#39C877' }
]

export function getMatchupTier(rank) {
  if (!Number.isFinite(rank) || rank < 1 || rank > 32) {
    return {
      label: 'Unavailable',
      color: '#8392a5'
    }
  }

  return matchupTiers.find(tier => rank <= tier.maxRank)
}

// Collect the combined production of ALL players in a position
// against a particular defense.
//
// For example, if three opposing wide receivers score 25, 2,
// and 5 PPR points, the defense allowed 32 WR points that game.

function getPositionTotals(defense, position) {
  const gamesPlayed = teamStats[defense]?.gamesPlayed ?? 0

  const opponents = regularSeasonPlayers.filter(
    player =>
      player.opponent_team === defense &&
      player.position === position
  )

  const sum = field =>
    opponents.reduce(
      (total, player) => total + number(player[field]),
      0
    )

  const perGame = total =>
    gamesPlayed > 0 ? total / gamesPlayed : 0

  const fantasyPoints = sum('fantasy_points_ppr')
  const passingYards = sum('passing_yards')
  const rushingYards = sum('rushing_yards')
  const receivingYards = sum('receiving_yards')
  const passingTDs = sum('passing_tds')
  const rushingTDs = sum('rushing_tds')
  const receivingTDs = sum('receiving_tds')
  const targets = sum('targets')
  const receptions = sum('receptions')
  const carries = sum('carries')

  return {
    defense,
    position,
    gamesPlayed,

    totals: {
      fantasyPoints,
      passingYards,
      rushingYards,
      receivingYards,
      passingTDs,
      rushingTDs,
      receivingTDs,
      targets,
      receptions,
      carries
    },

    perGame: {
      fantasyPoints: perGame(fantasyPoints),
      passingYards: perGame(passingYards),
      rushingYards: perGame(rushingYards),
      receivingYards: perGame(receivingYards),
      passingTDs: perGame(passingTDs),
      rushingTDs: perGame(rushingTDs),
      receivingTDs: perGame(receivingTDs),
      targets: perGame(targets),
      receptions: perGame(receptions),
      carries: perGame(carries)
    }
  }
}

// Calculate rankings separately for each position.
//
// Lowest PPR points allowed = rank 1.
// Highest PPR points allowed = rank 32.
//
// For tied PPR averages, use the same rank.
// The next ranking skips appropriately (competition ranking).

function calculateRankings(position) {
  const defenses = Object.keys(teamStats)
    .filter(defense => teamStats[defense].gamesPlayed > 0)
    .map(defense => getPositionTotals(defense, position))
    .sort((a, b) =>
      a.perGame.fantasyPoints - b.perGame.fantasyPoints
    )

  let previousPoints = null
  let previousRank = 0

  return defenses.map((defense, index) => {
    const points = defense.perGame.fantasyPoints

    const rank =
      previousPoints !== null &&
      Math.abs(points - previousPoints) < 0.000001
        ? previousRank
        : index + 1

    previousPoints = points
    previousRank = rank

    return {
      ...defense,
      rank,
      tier: getMatchupTier(rank)
    }
  })
}

// Export every position's defensive rankings.

export const positionalRankings = Object.fromEntries(
  POSITIONS.map(position => [
    position,
    calculateRankings(position)
  ])
)

// Retrieve one defense's matchup against one position.

export function getPositionalMatchup(defense, position) {
  const rankings = positionalRankings[position]

  if (!rankings) return null

  return rankings.find(item => item.defense === defense) ?? null
}

// Retrieve all four positional matchups for a defense.

export function getDefensePositionMatchups(defense) {
  return Object.fromEntries(
    POSITIONS.map(position => [
      position,
      getPositionalMatchup(defense, position)
    ])
  )
}
