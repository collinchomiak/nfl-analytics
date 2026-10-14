
import playerData from './playerStats2026.json'
import { getTeamStats } from './nflCalculations'

const number = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const regularSeason = playerData.players.filter(
  player => player.season_type === 'REG'
)

const teamIds = [
  'ARI', 'ATL', 'BAL', 'BUF',
  'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB',
  'HOU', 'IND', 'JAX', 'KC',
  'LA', 'LAC', 'LV', 'MIA',
  'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA',
  'SF', 'TB', 'TEN', 'WAS'
]

const tiers = [
  { maxRank: 12, label: 'Tough', color: '#EF5350' },
  { maxRank: 18, label: 'Below Average', color: '#F59E42' },
  { maxRank: 24, label: 'Favorable', color: '#E6CB55' },
  { maxRank: 32, label: 'Excellent', color: '#39C877' }
]

function getTier(rank) {
  return tiers.find(tier => rank <= tier.maxRank) ?? tiers[3]
}

// Calculate how much RECEIVING production opposing RBs
// have recorded against each defense.
//
// Rushing statistics are intentionally excluded.

function calculateRBReceivingAllowed(defense) {
  const gamesPlayed = getTeamStats(defense)?.gamesPlayed ?? 0

  const opponentRBs = regularSeason.filter(
    player =>
      player.opponent_team === defense &&
      player.position === 'RB'
  )

  const total = field =>
    opponentRBs.reduce(
      (sum, player) => sum + number(player[field]),
      0
    )

  const receptions = total('receptions')
  const receivingYards = total('receiving_yards')
  const receivingTDs = total('receiving_tds')
  const targets = total('targets')

  const perGame = value =>
    gamesPlayed > 0 ? value / gamesPlayed : 0

  return {
    defense,
    gamesPlayed,
    totals: {
      targets,
      receptions,
      receivingYards,
      receivingTDs
    },
    perGame: {
      targets: perGame(targets),
      receptions: perGame(receptions),
      receivingYards: perGame(receivingYards),
      receivingTDs: perGame(receivingTDs)
    }
  }
}

// Rank defenses from fewest RB receiving yards allowed
// per game (#1, toughest) to most (#32, easiest).

const rankedDefenses = teamIds
  .map(calculateRBReceivingAllowed)
  .sort((a, b) => {
    const difference =
      a.perGame.receivingYards - b.perGame.receivingYards

    if (difference !== 0) return difference

    return a.defense.localeCompare(b.defense)
  })

export const rbReceivingRankings = rankedDefenses.map(
  (defense, index) => {
    const previous = rankedDefenses[index - 1]

    const rank =
      previous &&
      previous.perGame.receivingYards ===
        defense.perGame.receivingYards
        ? null
        : index + 1

    return {
      ...defense,
      preliminaryRank: rank
    }
  }
).reduce((results, defense) => {
  const previous = results[results.length - 1]

  const rank = defense.preliminaryRank ??
    previous?.rank ??
    1

  results.push({
    defense: defense.defense,
    gamesPlayed: defense.gamesPlayed,
    totals: defense.totals,
    perGame: defense.perGame,
    rank,
    tier: getTier(rank)
  })

  return results
}, [])

// Retrieve one defense's matchup against receiving RBs.

export function getRBReceivingMatchup(defense) {
  return rbReceivingRankings.find(
    item => item.defense === defense
  ) ?? null
}
