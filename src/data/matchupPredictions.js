
import {
  getTeamScoring,
  leagueScoring
} from './teamScoring'

import {
  getTeamStats
} from './nflCalculations'

import {
  leagueAverages,
  getLeagueAdjustedAdvantage
} from './leagueAverages'

// NFL Analytics v1.2
// Experimental matchup-based scoring prediction.

// --------------------------------------------------
// MODEL SETTINGS
// --------------------------------------------------

const MIN_GAMES = 3
const MAX_TEAM_POINTS = 60

const LEAGUE_ADJUSTED_WEIGHT = 0.75
const ARITHMETIC_WEIGHT = 0.25

const PASSING_WEIGHT = 0.65
const RUSHING_WEIGHT = 0.35

const YARDAGE_SENSITIVITY = 0.12
const MAX_YARDAGE_ADJUSTMENT = 0.08

const LOCATION_PRIOR_GAMES = 18
const MIN_LOCATION_FACTOR = 0.90
const MAX_LOCATION_FACTOR = 1.10

// Set to false when diagnostic testing is finished.
const DEBUG_PREDICTIONS = true

// --------------------------------------------------
// UTILITIES
// --------------------------------------------------

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value))

const round = value =>
  Number.isFinite(value)
    ? Number(value.toFixed(3))
    : value

// --------------------------------------------------
// SCORING BASELINE
// --------------------------------------------------

function expectedPoints(offenseId, defenseId) {
  const offense = getTeamScoring(offenseId)
  const defense = getTeamScoring(defenseId)

  const leaguePPG =
    leagueScoring.pointsPerTeamPerGame

  if (
    !offense ||
    !defense ||
    offense.gamesPlayed < MIN_GAMES ||
    defense.gamesPlayed < MIN_GAMES ||
    !Number.isFinite(leaguePPG) ||
    leaguePPG <= 0
  ) {
    return null
  }

  const offensePPG = offense.pointsPerGame
  const defenseAllowed =
    defense.pointsAllowedPerGame

  if (
    !Number.isFinite(offensePPG) ||
    !Number.isFinite(defenseAllowed)
  ) {
    return null
  }

  const leagueAdjusted =
    (offensePPG * defenseAllowed) / leaguePPG

  const midpoint =
    (offensePPG + defenseAllowed) / 2

  const blended =
    leagueAdjusted * LEAGUE_ADJUSTED_WEIGHT +
    midpoint * ARITHMETIC_WEIGHT

  return clamp(blended, 0, MAX_TEAM_POINTS)
}

// --------------------------------------------------
// PASSING AND RUSHING MATCHUP ADJUSTMENT
// --------------------------------------------------

function yardageMatchupAdjustment(
  offenseId,
  defenseId
) {
  const offense = getTeamStats(offenseId)
  const defense = getTeamStats(defenseId)

  const neutralResult = {
    multiplier: 1,
    passingAdvantage: null,
    rushingAdvantage: null,
    combinedAdvantage: 0,
    adjustment: 0
  }

  if (
    !offense ||
    !defense ||
    offense.gamesPlayed < MIN_GAMES ||
    defense.gamesPlayed < MIN_GAMES
  ) {
    return neutralResult
  }

  const passingLeagueAverage =
    leagueAverages.passing

  const rushingLeagueAverage =
    leagueAverages.rushing

  if (
    !Number.isFinite(passingLeagueAverage) ||
    !Number.isFinite(rushingLeagueAverage) ||
    passingLeagueAverage <= 0 ||
    rushingLeagueAverage <= 0
  ) {
    return neutralResult
  }

  const passing = getLeagueAdjustedAdvantage(
    offense.passing,
    defense.passAllowed,
    passingLeagueAverage
  )

  const rushing = getLeagueAdjustedAdvantage(
    offense.rushing,
    defense.rushAllowed,
    rushingLeagueAverage
  )

  if (
    !passing ||
    !rushing ||
    !Number.isFinite(passing.advantage) ||
    !Number.isFinite(rushing.advantage)
  ) {
    return neutralResult
  }

  const passingAdvantage =
    passing.advantage / 100

  const rushingAdvantage =
    rushing.advantage / 100

  const combinedAdvantage =
    passingAdvantage * PASSING_WEIGHT +
    rushingAdvantage * RUSHING_WEIGHT

  const adjustment = clamp(
    combinedAdvantage * YARDAGE_SENSITIVITY,
    -MAX_YARDAGE_ADJUSTMENT,
    MAX_YARDAGE_ADJUSTMENT
  )

  return {
    multiplier: 1 + adjustment,
    passingAdvantage,
    rushingAdvantage,
    combinedAdvantage,
    adjustment
  }
}

// --------------------------------------------------
// HOME / AWAY ADJUSTMENTS
// --------------------------------------------------

function adjustedLocationFactor(
  locationAverage,
  overallAverage,
  locationGames
) {
  if (
    !Number.isFinite(locationAverage) ||
    !Number.isFinite(overallAverage) ||
    !Number.isFinite(locationGames) ||
    locationGames <= 0 ||
    overallAverage <= 0
  ) {
    return 1
  }

  const rawFactor =
    locationAverage / overallAverage

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

function locationMultiplier(
  offense,
  defense,
  offenseLocation,
  defenseLocation
) {
  const offenseStats = offense[offenseLocation]
  const defenseStats = defense[defenseLocation]

  if (!offenseStats || !defenseStats) {
    return 1
  }

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

  return Math.sqrt(
    offenseFactor * defenseFactor
  )
}

// --------------------------------------------------
// COMPLETE MATCHUP PREDICTION
// --------------------------------------------------

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

  // 1. Scoring baselines.

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

  // 2. Passing/rushing adjustments.

  const awayYardage = yardageMatchupAdjustment(
    awayId,
    homeId
  )

  const homeYardage = yardageMatchupAdjustment(
    homeId,
    awayId
  )

  // 3. Location adjustments.

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

  // 4. Expected scoring.

  const awayAfterYardage =
    awayBaseline * awayYardage.multiplier

  const homeAfterYardage =
    homeBaseline * homeYardage.multiplier

  const awayAfterLocation =
    awayBaseline * awayMultiplier

  const homeAfterLocation =
    homeBaseline * homeMultiplier

  const awayExpected = clamp(
    awayAfterYardage * awayMultiplier,
    0,
    MAX_TEAM_POINTS
  )

  const homeExpected = clamp(
    homeAfterYardage * homeMultiplier,
    0,
    MAX_TEAM_POINTS
  )

  const totalPoints =
    awayExpected + homeExpected

  // --------------------------------------------------
  // DIAGNOSTIC LOGGING
  // --------------------------------------------------

  if (DEBUG_PREDICTIONS) {
    const baselineTotal =
      awayBaseline + homeBaseline

    const yardageOnlyTotal =
      clamp(awayAfterYardage, 0, MAX_TEAM_POINTS) +
      clamp(homeAfterYardage, 0, MAX_TEAM_POINTS)

    const locationOnlyTotal =
      clamp(awayAfterLocation, 0, MAX_TEAM_POINTS) +
      clamp(homeAfterLocation, 0, MAX_TEAM_POINTS)

    console.group(
      `🏈 NFL Analytics v1.2: ${awayId} @ ${homeId}` +
      (neutralSite ? ' (Neutral Site)' : '')
    )

    console.table({
      'Away scoring baseline': {
        points: round(awayBaseline)
      },
      'Home scoring baseline': {
        points: round(homeBaseline)
      },
      'Baseline combined total': {
        points: round(baselineTotal)
      },
      'Passing/rushing only total': {
        points: round(yardageOnlyTotal)
      },
      'Home/away only total': {
        points: round(locationOnlyTotal)
      },
      'Final v1.2 total': {
        points: round(totalPoints)
      }
    })

    console.table({
      away: {
        offensePPG: round(awayScoring.pointsPerGame),
        opponentAllowedPPG: round(
          homeScoring.pointsAllowedPerGame
        ),
        baseline: round(awayBaseline),
        passingAdvantagePct: round(
          awayYardage.passingAdvantage === null
            ? null
            : awayYardage.passingAdvantage * 100
        ),
        rushingAdvantagePct: round(
          awayYardage.rushingAdvantage === null
            ? null
            : awayYardage.rushingAdvantage * 100
        ),
        yardageMultiplier: round(
          awayYardage.multiplier
        ),
        locationMultiplier: round(awayMultiplier),
        expectedPoints: round(awayExpected)
      },
      home: {
        offensePPG: round(homeScoring.pointsPerGame),
        opponentAllowedPPG: round(
          awayScoring.pointsAllowedPerGame
        ),
        baseline: round(homeBaseline),
        passingAdvantagePct: round(
          homeYardage.passingAdvantage === null
            ? null
            : homeYardage.passingAdvantage * 100
        ),
        rushingAdvantagePct: round(
          homeYardage.rushingAdvantage === null
            ? null
            : homeYardage.rushingAdvantage * 100
        ),
        yardageMultiplier: round(
          homeYardage.multiplier
        ),
        locationMultiplier: round(homeMultiplier),
        expectedPoints: round(homeExpected)
      }
    })

    console.groupEnd()
  }

  // 5. Winner and scoring separation.

  const signedDifference =
    homeExpected - awayExpected

  const difference =
    Math.abs(signedDifference)

  const winner =
    signedDifference > 0
      ? homeId
      : signedDifference < 0
        ? awayId
        : [awayId, homeId].sort()[0]

  let modelEdge = 'Very Slight Model Edge'

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

    internalExpectedPoints: {
      away: awayExpected,
      home: homeExpected
    },

    modelDetails: {
      awayBaseline,
      homeBaseline,

      baselineTotal:
        awayBaseline + homeBaseline,

      yardageOnlyTotal:
        clamp(awayAfterYardage, 0, MAX_TEAM_POINTS) +
        clamp(homeAfterYardage, 0, MAX_TEAM_POINTS),

      locationOnlyTotal:
        clamp(awayAfterLocation, 0, MAX_TEAM_POINTS) +
        clamp(homeAfterLocation, 0, MAX_TEAM_POINTS),

      awayYardageMultiplier:
        awayYardage.multiplier,

      homeYardageMultiplier:
        homeYardage.multiplier,

      awayPassingAdvantage:
        awayYardage.passingAdvantage,

      homePassingAdvantage:
        homeYardage.passingAdvantage,

      awayRushingAdvantage:
        awayYardage.rushingAdvantage,

      homeRushingAdvantage:
        homeYardage.rushingAdvantage,

      awayLocationMultiplier: awayMultiplier,
      homeLocationMultiplier: homeMultiplier,

      awayGames: awayScoring.gamesPlayed,
      homeGames: homeScoring.gamesPlayed,

      leaguePPG:
        leagueScoring.pointsPerTeamPerGame,

      leagueAdjustedWeight:
        LEAGUE_ADJUSTED_WEIGHT,

      arithmeticWeight:
        ARITHMETIC_WEIGHT,

      passingWeight: PASSING_WEIGHT,
      rushingWeight: RUSHING_WEIGHT,

      yardageSensitivity:
        YARDAGE_SENSITIVITY,

      locationPriorGames:
        LOCATION_PRIOR_GAMES
    }
  }
}
