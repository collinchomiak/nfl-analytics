
import scoreData from './teamScores2026.json'

const TEAM_IDS = [
  'ARI', 'ATL', 'BAL', 'BUF',
  'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB',
  'HOU', 'IND', 'JAX', 'KC',
  'LA', 'LAC', 'LV', 'MIA',
  'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA',
  'SF', 'TB', 'TEN', 'WAS'
]

const games = scoreData.games

const average = values =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) /
      values.length
    : 0

// Older records without a neutralSite field are treated
// as regular games, but our updated download script
// supplies this field explicitly.

const isNeutral = game => game.neutralSite === true

function calculateTeamScoring(teamId) {
  const teamGames = games.filter(game =>
    game.homeTeam === teamId ||
    game.awayTeam === teamId
  )

  // Neutral-site games count toward the team's overall
  // performance but NOT its home/away scoring splits.

  const neutralGames = teamGames.filter(isNeutral)

  const homeGames = teamGames.filter(game =>
    game.homeTeam === teamId &&
    !isNeutral(game)
  )

  const awayGames = teamGames.filter(game =>
    game.awayTeam === teamId &&
    !isNeutral(game)
  )

  const pointsScored = game =>
    game.homeTeam === teamId
      ? game.homeScore
      : game.awayScore

  const pointsAllowed = game =>
    game.homeTeam === teamId
      ? game.awayScore
      : game.homeScore

  const getLocationStats = locationGames => ({
    gamesPlayed: locationGames.length,

    pointsPerGame: average(
      locationGames.map(pointsScored)
    ),

    pointsAllowedPerGame: average(
      locationGames.map(pointsAllowed)
    )
  })

  return {
    team: teamId,

    gamesPlayed: teamGames.length,

    pointsPerGame: average(
      teamGames.map(pointsScored)
    ),

    pointsAllowedPerGame: average(
      teamGames.map(pointsAllowed)
    ),

    home: getLocationStats(homeGames),

    away: getLocationStats(awayGames),

    neutral: getLocationStats(neutralGames),

    totalPointsScored: teamGames.reduce(
      (sum, game) => sum + pointsScored(game),
      0
    ),

    totalPointsAllowed: teamGames.reduce(
      (sum, game) => sum + pointsAllowed(game),
      0
    )
  }
}

export const teamScoring = Object.fromEntries(
  TEAM_IDS.map(teamId => [
    teamId,
    calculateTeamScoring(teamId)
  ])
)

export function getTeamScoring(teamId) {
  return teamScoring[teamId] ?? null
}

const nonNeutralGames = games.filter(
  game => !isNeutral(game)
)

export const leagueScoring = {
  completedGames: games.length,

  neutralGames: games.filter(isNeutral).length,

  regularVenueGames: nonNeutralGames.length,

  pointsPerTeamPerGame: average(
    games.flatMap(game => [
      game.awayScore,
      game.homeScore
    ])
  ),

  combinedPointsPerGame: average(
    games.map(game =>
      game.awayScore + game.homeScore
    )
  ),

  homePointsPerGame: average(
    nonNeutralGames.map(game => game.homeScore)
  ),

  awayPointsPerGame: average(
    nonNeutralGames.map(game => game.awayScore)
  ),

  homeFieldScoringDifference:
    average(nonNeutralGames.map(game => game.homeScore)) -
    average(nonNeutralGames.map(game => game.awayScore))
}

export const scoringSeason = scoreData.season
export const scoringUpdatedAt = scoreData.updatedAt
