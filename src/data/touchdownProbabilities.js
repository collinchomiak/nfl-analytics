
import { getTeamStats } from './nflCalculations'

// Experimental touchdown probability model.
// These estimates are NOT validated betting probabilities.

// Estimate the expected number of touchdowns in a matchup.
// For now, use an equal-weight midpoint of offensive production
// and the opposing defense's touchdowns allowed.
export function estimateTouchdownRate(
  offenseAverage,
  defenseAllowedAverage
) {
  if (
    !Number.isFinite(offenseAverage) ||
    !Number.isFinite(defenseAllowedAverage) ||
    offenseAverage < 0 ||
    defenseAllowedAverage < 0
  ) {
    return null
  }

  return (offenseAverage + defenseAllowedAverage) / 2
}

// Poisson probability of scoring at least N touchdowns.
export function probabilityAtLeast(lambda, minimumTDs) {
  if (
    !Number.isFinite(lambda) ||
    lambda < 0 ||
    !Number.isInteger(minimumTDs) ||
    minimumTDs < 1
  ) {
    return null
  }

  let probabilityBelowThreshold = 0
  let term = Math.exp(-lambda)

  for (let k = 0; k < minimumTDs; k++) {
    if (k > 0) {
      term *= lambda / k
    }

    probabilityBelowThreshold += term
  }

  const probability = 1 - probabilityBelowThreshold

  // Protect against tiny floating-point rounding errors.
  return Math.min(1, Math.max(0, probability))
}

// Calculate 1+, 2+, and 3+ TD probabilities for one matchup.
export function getTouchdownProbabilities(
  offensiveTeam,
  defensiveTeam,
  touchdownType = 'passing'
) {
  const offense = getTeamStats(offensiveTeam)
  const defense = getTeamStats(defensiveTeam)

  if (
    !offense?.gamesPlayed ||
    !defense?.gamesPlayed
  ) {
    return null
  }

  const isRushing = touchdownType === 'rushing'

  const offenseAverage = isRushing
    ? offense.rushTD
    : offense.passTD

  const defenseAllowedAverage = isRushing
    ? defense.rushTDAllowed
    : defense.passTDAllowed

  const expectedTDs = estimateTouchdownRate(
    offenseAverage,
    defenseAllowedAverage
  )

  if (expectedTDs === null) {
    return null
  }

  return {
    offensiveTeam,
    defensiveTeam,
    touchdownType,
    offenseAverage,
    defenseAllowedAverage,
    expectedTDs,
    probabilities: {
      onePlus: probabilityAtLeast(expectedTDs, 1),
      twoPlus: probabilityAtLeast(expectedTDs, 2),
      threePlus: probabilityAtLeast(expectedTDs, 3)
    },
    model: 'Experimental Poisson midpoint model'
  }
}
