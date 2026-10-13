
import { teamStats } from './nflCalculations'

// Calculate league averages using total production divided
// by total team-games played, rather than averaging team
// averages equally.
//
// This keeps the calculation accurate even when some teams
// have played more games than others because of bye weeks.

function calculateLeagueAverages() {
  const teams = Object.values(teamStats).filter(
    team => team.gamesPlayed > 0
  )

  const totalTeamGames = teams.reduce(
    (total, team) => total + team.gamesPlayed,
    0
  )

  if (totalTeamGames === 0) {
    return {
      passing: 0,
      rushing: 0,
      passTD: 0,
      rushTD: 0,
      teamGames: 0
    }
  }

  const weightedAverage = (field) => {
    const total = teams.reduce(
      (sum, team) => sum + team[field] * team.gamesPlayed,
      0
    )

    return total / totalTeamGames
  }

  return {
    passing: weightedAverage('passing'),
    rushing: weightedAverage('rushing'),
    passTD: weightedAverage('passTD'),
    rushTD: weightedAverage('rushTD'),
    teamGames: totalTeamGames
  }
}

export const leagueAverages = calculateLeagueAverages()

// Compare the offense and defense relative to the
// current season's NFL-wide benchmark.
//
// A positive result favors the offense.
// A negative result favors the defense.

export function getLeagueAdjustedAdvantage(
  offensiveAverage,
  defensiveAverage,
  leagueAverage
) {
  if (!leagueAverage || leagueAverage <= 0) {
    return null
  }

  const offenseDifference =
    ((offensiveAverage - leagueAverage) / leagueAverage) * 100

  const defenseStrength =
    ((leagueAverage - defensiveAverage) / leagueAverage) * 100

  return {
    offenseDifference,
    defenseStrength,
    advantage: offenseDifference - defenseStrength,
    leagueAverage
  }
}
