
import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import {
  getTeamStats,
  getPlayersForTeam,
  nflSeason,
  nflDataUpdatedAt
} from './data/nflCalculations'
import {
  leagueAverages,
  getLeagueAdjustedAdvantage
} from './data/leagueAverages'
import {
  getTouchdownProbabilities
} from './data/touchdownProbabilities'
import DefensiveBreakdown from './pages/DefensiveBreakdown'
import PlayerGameLogs from './pages/PlayerGameLogs'
import FantasyMatchupOutlook from './components/FantasyMatchupOutlook'
import './pages/DefensiveBreakdown.css'
import './pages/PlayerGameLogs.css'
import './components/FantasyMatchupOutlook.css'
import './App.css'

const teams = {
  ARI: { name: 'Arizona Cardinals', short: 'Cardinals', division: 'NFC West', color: '#E74B58' },
  ATL: { name: 'Atlanta Falcons', short: 'Falcons', division: 'NFC South', color: '#E54A53' },
  BAL: { name: 'Baltimore Ravens', short: 'Ravens', division: 'AFC North', color: '#BF99FF' },
  BUF: { name: 'Buffalo Bills', short: 'Bills', division: 'AFC East', color: '#73A9FF' },
  CAR: { name: 'Carolina Panthers', short: 'Panthers', division: 'NFC South', color: '#60C5F7' },
  CHI: { name: 'Chicago Bears', short: 'Bears', division: 'NFC North', color: '#F4A261' },
  CIN: { name: 'Cincinnati Bengals', short: 'Bengals', division: 'AFC North', color: '#FF995C' },
  CLE: { name: 'Cleveland Browns', short: 'Browns', division: 'AFC North', color: '#ED955A' },
  DAL: { name: 'Dallas Cowboys', short: 'Cowboys', division: 'NFC East', color: '#93B8F0' },
  DEN: { name: 'Denver Broncos', short: 'Broncos', division: 'AFC West', color: '#FF9D69' },
  DET: { name: 'Detroit Lions', short: 'Lions', division: 'NFC North', color: '#6DBBFF' },
  GB: { name: 'Green Bay Packers', short: 'Packers', division: 'NFC North', color: '#8ED0A0' },
  HOU: { name: 'Houston Texans', short: 'Texans', division: 'AFC South', color: '#89A9DE' },
  IND: { name: 'Indianapolis Colts', short: 'Colts', division: 'AFC South', color: '#8DAFFF' },
  JAX: { name: 'Jacksonville Jaguars', short: 'Jaguars', division: 'AFC South', color: '#57D4C4' },
  KC: { name: 'Kansas City Chiefs', short: 'Chiefs', division: 'AFC West', color: '#89C9FF' },
  LA: { name: 'Los Angeles Rams', short: 'Rams', division: 'NFC West', color: '#E8BD65' },
  LAC: { name: 'Los Angeles Chargers', short: 'Chargers', division: 'AFC West', color: '#75CBFF' },
  LV: { name: 'Las Vegas Raiders', short: 'Raiders', division: 'AFC West', color: '#BBC5D3' },
  MIA: { name: 'Miami Dolphins', short: 'Dolphins', division: 'AFC East', color: '#5CDBC8' },
  MIN: { name: 'Minnesota Vikings', short: 'Vikings', division: 'NFC North', color: '#C3A4FF' },
  NE: { name: 'New England Patriots', short: 'Patriots', division: 'AFC East', color: '#A5BCEB' },
  NO: { name: 'New Orleans Saints', short: 'Saints', division: 'NFC South', color: '#E6CB90' },
  NYG: { name: 'New York Giants', short: 'Giants', division: 'NFC East', color: '#8C9FFF' },
  NYJ: { name: 'New York Jets', short: 'Jets', division: 'AFC East', color: '#78CC9D' },
  PHI: { name: 'Philadelphia Eagles', short: 'Eagles', division: 'NFC East', color: '#B4F26C' },
  PIT: { name: 'Pittsburgh Steelers', short: 'Steelers', division: 'AFC North', color: '#F1CB64' },
  SEA: { name: 'Seattle Seahawks', short: 'Seahawks', division: 'NFC West', color: '#8CCCF1' },
  SF: { name: 'San Francisco 49ers', short: '49ers', division: 'NFC West', color: '#F47B72' },
  TB: { name: 'Tampa Bay Buccaneers', short: 'Buccaneers', division: 'NFC South', color: '#F27676' },
  TEN: { name: 'Tennessee Titans', short: 'Titans', division: 'AFC South', color: '#7AB7E9' },
  WAS: { name: 'Washington Commanders', short: 'Commanders', division: 'NFC East', color: '#D98D82' }
}

const statRows = [
  ['Passing Yards / Game', 'passing'],
  ['Rushing Yards / Game', 'rushing'],
  ['Passing TDs / Game', 'passTD'],
  ['Rushing TDs / Game', 'rushTD'],
  ['Pass Yards Allowed / Game', 'passAllowed'],
  ['Rush Yards Allowed / Game', 'rushAllowed'],
  ['Passing TDs Allowed / Game', 'passTDAllowed'],
  ['Rushing TDs Allowed / Game', 'rushTDAllowed'],
  ['Targets Allowed / Game', 'targetsAllowed'],
  ['Receptions Allowed / Game', 'receptionsAllowed'],
  ['Receiving TDs Allowed / Game', 'receivingTDAllowed']
]

const yardageCategories = [
  {
    label: 'Passing Yards',
    offenseKey: 'passing',
    defenseKey: 'passAllowed',
    leagueKey: 'passing'
  },
  {
    label: 'Rushing Yards',
    offenseKey: 'rushing',
    defenseKey: 'rushAllowed',
    leagueKey: 'rushing'
  }
]

const number = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatStat = value =>
  Number.isFinite(value) ? value.toFixed(1) : '—'

const formatSigned = value =>
  `${value > 0 ? '+' : ''}${value.toFixed(1)}`

const formatPercent = value =>
  value === null || !Number.isFinite(value)
    ? '—'
    : `${(value * 100).toFixed(1)}%`

function getWeeklyPassing(teamId) {
  const weekly = new Map()

  for (const player of getPlayersForTeam(teamId)) {
    if (player.season_type !== 'REG') continue

    const week = number(player.week)
    if (!week) continue

    weekly.set(
      week,
      (weekly.get(week) ?? 0) + number(player.passing_yards)
    )
  }

  return [...weekly.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, yards]) => ({
      week: `W${week}`,
      yards
    }))
}

function YardageMatchup({ offense, defense, category }) {
  const offenseStats = getTeamStats(offense)
  const defenseStats = getTeamStats(defense)

  if (!offenseStats?.gamesPlayed || !defenseStats?.gamesPlayed) {
    return (
      <div className="matchup-empty">
        Not enough game data yet.
      </div>
    )
  }

  const offenseAverage = offenseStats[category.offenseKey]
  const defenseAverage = defenseStats[category.defenseKey]
  const leagueAverage = leagueAverages[category.leagueKey]

  const adjusted = getLeagueAdjustedAdvantage(
    offenseAverage,
    defenseAverage,
    leagueAverage
  )

  if (!adjusted) {
    return (
      <div className="matchup-empty">
        League benchmark unavailable.
      </div>
    )
  }

  const advantage = adjusted.advantage
  const isEven = Math.abs(advantage) < 0.000001
  const favorsOffense = advantage > 0

  const label = isEven
    ? 'Even Matchup'
    : `Favors ${teams[favorsOffense ? offense : defense].short}`

  const resultColor = isEven
    ? '#aebac9'
    : favorsOffense
      ? '#a8e276'
      : '#f48c86'

  return (
    <div
      style={{
        padding: '14px',
        background: '#141b24',
        border: '1px solid #303c4a',
        borderRadius: '9px',
        marginBottom: '9px'
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: '#aebac9',
          marginBottom: '10px'
        }}
      >
        {teams[offense].short} OFF vs. {teams[defense].short} DEF
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <strong
          style={{
            fontSize: '20px',
            color: resultColor
          }}
        >
          {formatSigned(advantage)}%
        </strong>

        <span
          style={{
            fontSize: '11px',
            fontWeight: '700',
            color: resultColor
          }}
        >
          ({label})
        </span>
      </div>

      <div
        style={{
          marginTop: '12px',
          color: '#8392a5',
          fontSize: '11px',
          lineHeight: '1.8'
        }}
      >
        <div>
          {teams[offense].short} offense:{' '}
          {formatSigned(adjusted.offenseDifference)}% vs. NFL avg.
        </div>

        <div>
          {teams[defense].short} defensive strength:{' '}
          {formatSigned(adjusted.defenseStrength)}% vs. NFL avg.
        </div>

        <div>
          NFL average: {formatStat(leagueAverage)} yards/game
        </div>

        <div style={{ marginTop: '6px', color: '#aebac9' }}>
          {formatStat(offenseAverage)} gained/game ·{' '}
          {formatStat(defenseAverage)} allowed/game
        </div>
      </div>
    </div>
  )
}

function TouchdownMatchup({ offense, defense, touchdownType }) {
  const result = getTouchdownProbabilities(
    offense,
    defense,
    touchdownType
  )

  if (!result) {
    return (
      <div className="matchup-empty">
        Touchdown statistics unavailable.
      </div>
    )
  }

  const probabilities = [
    { label: '1+ TD', value: result.probabilities.onePlus },
    { label: '2+ TD', value: result.probabilities.twoPlus },
    { label: '3+ TD', value: result.probabilities.threePlus }
  ]

  return (
    <div
      style={{
        padding: '15px',
        background: '#141b24',
        border: '1px solid #303c4a',
        borderRadius: '9px',
        marginBottom: '10px'
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: '#aebac9',
          marginBottom: '13px'
        }}
      >
        {teams[offense].short} OFF vs. {teams[defense].short} DEF
      </div>

      <div
        style={{
          fontSize: '11px',
          color: '#96a3b4',
          marginBottom: '5px'
        }}
      >
        Experimental expected TDs
      </div>

      <div
        style={{
          fontSize: '25px',
          fontWeight: '800',
          color: teams[offense].color,
          marginBottom: '17px'
        }}
      >
        {result.expectedTDs.toFixed(2)}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '7px',
          marginBottom: '18px'
        }}
      >
        {probabilities.map(item => (
          <div
            key={item.label}
            style={{
              padding: '12px 5px',
              textAlign: 'center',
              borderRadius: '7px',
              background: '#253140',
              border: '1px solid #384657'
            }}
          >
            <div
              style={{
                color: '#aebac9',
                fontSize: '10px',
                marginBottom: '7px'
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                color: teams[offense].color,
                fontSize: '17px',
                fontWeight: '800'
              }}
            >
              {formatPercent(item.value)}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          color: '#96a3b4',
          fontSize: '11px',
          lineHeight: '1.9'
        }}
      >
        <div>
          {teams[offense].short} offense:{' '}
          {formatStat(result.offenseAverage)} TDs/game
        </div>

        <div>
          {teams[defense].short} defense:{' '}
          {formatStat(result.defenseAllowedAverage)} allowed/game
        </div>
      </div>

      <div
        style={{
          marginTop: '12px',
          paddingTop: '11px',
          borderTop: '1px solid #303c4a',
          color: '#77889d',
          fontSize: '10px',
          lineHeight: '1.6'
        }}
      >
        Experimental Poisson midpoint model.
        These percentages are not validated betting probabilities.
      </div>
    </div>
  )
}

function TeamPanel({
  teamId,
  opponentId,
  index,
  onOpponentClick,
  onPlayerClick
}) {
  const team = teams[teamId]
  const stats = getTeamStats(teamId)
  const weekly = getWeeklyPassing(teamId)

  return (
    <article
      className="team-panel"
      style={{ '--team-color': team.color }}
    >
      <div className="panel-heading">
        TEAM {index + 1}
      </div>

      <h3>{team.name}</h3>
      <div className="division">{team.division}</div>

      <div className="chart-heading">
        Weekly Passing Yards
      </div>

      <div className="chart-container">
        {weekly.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly}>
              <CartesianGrid
                stroke="#303641"
                vertical={false}
              />
              <XAxis
                dataKey="week"
                tick={{ fill: '#8B96A8', fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: '#8B96A8', fontSize: 11 }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: '#1B2430',
                  border: '1px solid #384354',
                  color: '#fff'
                }}
              />
              <Bar
                dataKey="yards"
                name="Passing Yards"
                fill={team.color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#96a3b4', fontSize: '12px' }}>
            No weekly statistics available.
          </p>
        )}
      </div>

      <div
        style={{
          color: '#8392a5',
          fontSize: '11px',
          marginBottom: '18px'
        }}
      >
        {stats?.gamesPlayed ?? 0} games recorded · 2026 regular season
      </div>

      <div className="stat-list">
        {statRows.map(([label, key]) => (
          <div className="stat-row" key={key}>
            <span>{label}</span>
            <strong>
              {stats?.gamesPlayed
                ? formatStat(stats[key])
                : '—'}
            </strong>
          </div>
        ))}
      </div>

      <div className="opponents">
        <span>Past Opponents</span>

        {stats?.opponents?.length ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            {stats.opponents.map(opponent => (
              <button
                type="button"
                key={opponent.gameId}
                title={`Open Week ${opponent.week}: ${opponent.team} vs. ${teamId} defensive breakdown`}
                aria-label={`Open Week ${opponent.week} ${opponent.team} against ${team.name} defensive breakdown`}
                onClick={() => onOpponentClick(teamId, opponent.gameId)}
                style={{
                  padding: '7px 10px',
                  background: '#273443',
                  border: '1px solid #3c4a5b',
                  borderRadius: '6px',
                  color: '#e4eaf2',
                  fontSize: '12px',
                  fontWeight: '700',
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                {opponent.team}
              </button>
            ))}
          </div>
        ) : (
          <p>No opponent records available.</p>
        )}
      </div>

      <FantasyMatchupOutlook
        teamId={teamId}
        opponentId={opponentId}
        onPlayerClick={onPlayerClick}
      />
    </article>
  )
}

function App() {
  const [team1, setTeam1] = useState('KC')
  const [team2, setTeam2] = useState('PHI')
  const [activePage, setActivePage] = useState('comparison')

  const [defenseNavigation, setDefenseNavigation] = useState({
    team: 'PHI',
    gameId: null,
    visit: 0
  })

  const [playerNavigation, setPlayerNavigation] = useState({
    playerId: null,
    visit: 0
  })

  const openDefensiveGame = (team, gameId) => {
    setDefenseNavigation(previous => ({
      team,
      gameId,
      visit: previous.visit + 1
    }))
    setActivePage('defense')
  }

  const openDefensivePage = () => {
    setDefenseNavigation(previous => ({
      team: 'PHI',
      gameId: null,
      visit: previous.visit + 1
    }))
    setActivePage('defense')
  }

  const openPlayerProfile = playerId => {
    setPlayerNavigation(previous => ({
      playerId,
      visit: previous.visit + 1
    }))
    setActivePage('players')
  }

  const openPlayerPage = () => {
    setPlayerNavigation(previous => ({
      playerId: null,
      visit: previous.visit + 1
    }))
    setActivePage('players')
  }

  const lastUpdated = nflDataUpdatedAt
    ? new Date(nflDataUpdatedAt).toLocaleString()
    : 'Unknown'

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🏈</span>
          <div>
            <h1>NFL Analytics</h1>
            <p>Matchup Research Dashboard</p>
          </div>
        </div>

        <div className="selector-group">
          <label htmlFor="team1">Team 1</label>
          <select
            id="team1"
            value={team1}
            onChange={event => setTeam1(event.target.value)}
          >
            {Object.entries(teams).map(([id, team]) => (
              <option key={id} value={id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div className="selector-group">
          <label htmlFor="team2">Team 2</label>
          <select
            id="team2"
            value={team2}
            onChange={event => setTeam2(event.target.value)}
          >
            {Object.entries(teams).map(([id, team]) => (
              <option key={id} value={id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="navigation" aria-label="Dashboard pages">
          <a
            href="#comparison"
            aria-current={activePage === 'comparison' ? 'page' : undefined}
            onClick={() => setActivePage('comparison')}
          >
            📊 Team Comparison
          </a>

          <a
            href="#defense"
            aria-current={activePage === 'defense' ? 'page' : undefined}
            onClick={openDefensivePage}
          >
            🛡️ Defensive Breakdown
          </a>

          <a
            href="#players"
            aria-current={activePage === 'players' ? 'page' : undefined}
            onClick={openPlayerPage}
          >
            👤 Player Game Logs
          </a>
        </nav>

        <p className="sidebar-note">
          2026 NFL player statistics
          <br />
          Data updated: {lastUpdated}
        </p>
      </aside>

      {activePage === 'comparison' && (
        <main className="dashboard" id="comparison">
          <header className="dashboard-header">
            <div>
              <span className="eyebrow">
                {nflSeason} NFL Season
              </span>

              <h2>Team Matchup Comparison</h2>

              <p>
                Compare offensive production, defensive performance,
                yardage advantages, and touchdown opportunities.
              </p>
            </div>

            <span className="prototype-badge">
              2026 Player Data
            </span>
          </header>

          <section className="comparison-grid">
            <TeamPanel
              teamId={team1}
              opponentId={team2}
              index={0}
              onOpponentClick={openDefensiveGame}
              onPlayerClick={openPlayerProfile}
            />

            <TeamPanel
              teamId={team2}
              opponentId={team1}
              index={1}
              onOpponentClick={openDefensiveGame}
              onPlayerClick={openPlayerProfile}
            />

            <article className="difference-panel">
              <div className="panel-heading">
                OFFENSE VS. DEFENSE
              </div>

              <h3>Matchup Analysis</h3>

              <div className="division">
                {teams[team1].name} vs. {teams[team2].name}
              </div>

              <p
                style={{
                  color: '#96a3b4',
                  fontSize: '12px',
                  lineHeight: '1.7',
                  marginTop: '20px',
                  marginBottom: '22px'
                }}
              >
                Yardage uses league-adjusted statistical
                advantages. Touchdowns use experimental
                probability estimates for each offense.
              </p>

              {yardageCategories.map(category => (
                <div
                  key={category.label}
                  style={{ marginBottom: '23px' }}
                >
                  <div
                    style={{
                      color: '#e4eaf2',
                      fontWeight: '800',
                      fontSize: '12px',
                      marginBottom: '12px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #354253'
                    }}
                  >
                    {category.label}
                  </div>

                  <YardageMatchup
                    offense={team1}
                    defense={team2}
                    category={category}
                  />

                  <YardageMatchup
                    offense={team2}
                    defense={team1}
                    category={category}
                  />
                </div>
              ))}

              <div style={{ marginBottom: '23px' }}>
                <div
                  style={{
                    color: '#e4eaf2',
                    fontWeight: '800',
                    fontSize: '12px',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #354253'
                  }}
                >
                  Passing TD Opportunities
                </div>

                <TouchdownMatchup
                  offense={team1}
                  defense={team2}
                  touchdownType="passing"
                />

                <TouchdownMatchup
                  offense={team2}
                  defense={team1}
                  touchdownType="passing"
                />
              </div>

              <div style={{ marginBottom: '23px' }}>
                <div
                  style={{
                    color: '#e4eaf2',
                    fontWeight: '800',
                    fontSize: '12px',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #354253'
                  }}
                >
                  Rushing TD Opportunities
                </div>

                <TouchdownMatchup
                  offense={team1}
                  defense={team2}
                  touchdownType="rushing"
                />

                <TouchdownMatchup
                  offense={team2}
                  defense={team1}
                  touchdownType="rushing"
                />
              </div>

              <p className="difference-note">
                Yardage percentages indicate historical
                statistical advantages, not projected yards.
                Touchdown probabilities use an experimental
                Poisson model and have not been validated
                for betting decisions.
              </p>
            </article>
          </section>
        </main>
      )}

      {activePage === 'defense' && (
        <DefensiveBreakdown
          key={`${defenseNavigation.visit}-${defenseNavigation.team}-${defenseNavigation.gameId ?? 'latest'}`}
          initialTeam={defenseNavigation.team}
          initialGameId={defenseNavigation.gameId}
          onPlayerClick={openPlayerProfile}
        />
      )}

      {activePage === 'players' && (
        <PlayerGameLogs
          key={`${playerNavigation.visit}-${playerNavigation.playerId ?? 'browse'}`}
          initialPlayerId={playerNavigation.playerId}
        />
      )}
    </div>
  )
}

export default App
