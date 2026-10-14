
import {
  getTeamScoring,
  leagueScoring
} from './teamScoring'

const MIN_GAMES = 3

// Smoothing parameter for location-specific game counts.
// With only two games, the observed difference receives
// 2 / (2 + 6) = 25% weight.

const LOCATION_PRIOR_GAMES = 6

// Guardrails while the model is experimental.

const MIN_LOCATION_FACTOR = 0.75
const MAX_LOCATION_FACTOR = 1.25

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value))

function expectedPoints(offenseId, defenseId) {
  const offense = getTeamScoring(offenseId)
  const defense = getTeamScoring(defenseId)

  const leaguePPG = leagueScoring.pointsPerTeamPerGame

  if (
    !offense ||
    !defense ||
    offense.gamesPlayed < MIN_GAMES ||
    defense.gamesPlayed < MIN_GAMES ||
    leaguePPG <= 0
  ) {
    return null
  }

  const offensePPG = offense.pointsPerGame
  const defenseAllowed = defense.pointsAllowedPerGame

  const leagueAdjusted =
    (offensePPG * defenseAllowed) / leaguePPG

  const midpoint =
    (offensePPG + defenseAllowed) / 2

  return clamp(
    (leagueAdjusted + midpoint) / 2,
    0,
    60
  )
}

// Calculates a location ratio and gradually pulls it
// toward 1.0 when there are few games in that location.

function adjustedLocationFactor(
  locationAverage,
  overallAverage,
  locationGames
) {
  if (
    locationGames <= 0 ||
    overallAverage <= 0
  ) {
    return 1
  }

  const rawFactor = locationAverage / overallAverage

  const weight =
    locationGames /
    (locationGames + LOCATION_PRIOR_GAMES)

  const adjustedFactor =
    1 + weight * (rawFactor - 1)

  return clamp(
    adjustedFactor,
    MIN_LOCATION_FACTOR,
    MAX_LOCATION_FACTOR
  )
}

// Both location effects matter:
// 1. Offensive performance in that location.
// 2. Opposing defense's points allowed in its location.

function locationMultiplier(
  offense,
  defense,
  offenseLocation,
  defenseLocation
) {
  const offenseStats = offense[offenseLocation]
  const defenseStats = defense[defenseLocation]

  const offenseFactor = adjustedLocationFactor(
    offenseStats.pointsPerGame,
    offense.pointsPerGame,
    offenseStats.gamesPlayed
  )

  const defenseFactor = adjustedLocationFactor(
    defenseStats.pointsAllowedPerGame,
    defense.pointsAllowedPerGame,
    defenseStats.gamesPlayed
  )

  // Geometric mean prevents adding the two
  // percentage changes as independent bonuses.

  return Math.sqrt(
    offenseFactor * defenseFactor
  )
}

export function getMatchupPrediction(
  awayId,
  homeId,
  neutralSite = false
) {
  if (
    !awayId ||
    !homeId ||
    awayId === homeId
  ) {
    return null
  }

  const awayScoring = getTeamScoring(awayId)
  const homeScoring = getTeamScoring(homeId)

  if (!awayScoring || !homeScoring) {
    return null
  }

  const awayBaseline = expectedPoints(
    awayId,
    homeId
  )

  const homeBaseline = expectedPoints(
    homeId,
    awayId
  )

  if (
    awayBaseline === null ||
    homeBaseline === null
  ) {
    return null
  }

  const awayMultiplier = neutralSite
    ? 1
    : locationMultiplier(
        awayScoring,
        homeScoring,
        'away',
        'home'
      )

  const homeMultiplier = neutralSite
    ? 1
    : locationMultiplier(
        homeScoring,
        awayScoring,
        'home',
        'away'
      )

  // Keep projected team scores internal.
  // The UI will show only the combined game total.

  const awayExpected = clamp(
    awayBaseline * awayMultiplier,
    0,
    60
  )

  const homeExpected = clamp(
    homeBaseline * homeMultiplier,
    0,
    60
  )

  const totalPoints =
    awayExpected + homeExpected

  const signedDifference =
    homeExpected - awayExpected

  const difference =
    Math.abs(signedDifference)

  // No clear winner for very small estimated differences.

  const winner =
    difference < 2
      ? null
      : signedDifference > 0
        ? homeId
        : awayId

  // These labels measure estimated scoring separation.
  // They are not calibrated win probabilities.

  let modelEdge = 'No Clear Edge'

  if (difference >= 10) {
    modelEdge = 'Strong Model Edge'
  } else if (difference >= 5) {
    modelEdge = 'Moderate Model Edge'
  } else if (difference >= 2) {
    modelEdge = 'Slight Model Edge'
  }

  return {
    awayTeam: awayId,
    homeTeam: homeId,
    neutralSite,

    projectedWinner: winner,
    modelEdge,

    projectedTotal: totalPoints,
    pointDifference: difference,

    // Retained for testing, but not displayed in the UI.
    internalExpectedPoints: {
      away: awayExpected,
      home: homeExpected
    },

    modelDetails: {
      awayBaseline,
      homeBaseline,
      awayLocationMultiplier: awayMultiplier,
      homeLocationMultiplier: homeMultiplier,
      awayGames: awayScoring.gamesPlayed,
      homeGames: homeScoring.gamesPlayed,
      leaguePPG: leagueScoring.pointsPerTeamPerGame
    }
  }
}
