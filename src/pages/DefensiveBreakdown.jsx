
import { useState } from 'react'
import { getDefensiveSummary } from '../data/defensiveAnalysis'
import './DefensiveBreakdown.css'

const teamNames = {
  ARI: 'Arizona Cardinals',
  ATL: 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',
  BUF: 'Buffalo Bills',
  CAR: 'Carolina Panthers',
  CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals',
  CLE: 'Cleveland Browns',
  DAL: 'Dallas Cowboys',
  DEN: 'Denver Broncos',
  DET: 'Detroit Lions',
  GB: 'Green Bay Packers',
  HOU: 'Houston Texans',
  IND: 'Indianapolis Colts',
  JAX: 'Jacksonville Jaguars',
  KC: 'Kansas City Chiefs',
  LA: 'Los Angeles Rams',
  LAC: 'Los Angeles Chargers',
  LV: 'Las Vegas Raiders',
  MIA: 'Miami Dolphins',
  MIN: 'Minnesota Vikings',
  NE: 'New England Patriots',
  NO: 'New Orleans Saints',
  NYG: 'New York Giants',
  NYJ: 'New York Jets',
  PHI: 'Philadelphia Eagles',
  PIT: 'Pittsburgh Steelers',
  SEA: 'Seattle Seahawks',
  SF: 'San Francisco 49ers',
  TB: 'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans',
  WAS: 'Washington Commanders'
}

const categoryColumns = {
  passing: [
    ['attempts', 'ATT'],
    ['completions', 'COMP'],
    ['yards', 'YDS'],
    ['touchdowns', 'TD'],
    ['interceptions', 'INT']
  ],
  rushing: [
    ['carries', 'ATT'],
    ['yards', 'YDS'],
    ['touchdowns', 'TD']
  ],
  receiving: [
    ['targets', 'TGT'],
    ['receptions', 'REC'],
    ['yards', 'YDS'],
    ['touchdowns', 'TD']
  ]
}

function DefensiveBreakdown({
  initialTeam = 'PHI',
  initialGameId = null,
  onPlayerClick = null
}) {
  const [selectedTeam, setSelectedTeam] = useState(initialTeam)
  const [selectedGameId, setSelectedGameId] = useState(initialGameId)
  const [category, setCategory] = useState('passing')

  const summary = getDefensiveSummary(selectedTeam)

  const selectedGame =
    summary.games.find(game => game.gameId === selectedGameId) ||
    summary.games[summary.games.length - 1]

  const activePlayers = selectedGame?.players[category] || []

  const handleTeamChange = event => {
    setSelectedTeam(event.target.value)
    setSelectedGameId(null)
  }

  const average = value =>
    Number.isFinite(value) ? value.toFixed(1) : '—'

  return (
    <main className="defensive-page">
      <div className="defensive-header">
        <div>
          <span className="eyebrow">2026 NFL Season</span>
          <h2>Defensive Breakdown</h2>
          <p>
            Explore every opponent and individual player
            performance against a selected defense.
          </p>
        </div>
      </div>

      <div className="defensive-controls">
        <div className="selector-group">
          <label htmlFor="defense-team">Select Defense</label>
          <select
            id="defense-team"
            value={selectedTeam}
            onChange={handleTeamChange}
          >
            {Object.entries(teamNames).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="defensive-summary">
        <h3>{teamNames[selectedTeam]}</h3>
        <p>
          {summary.gamesPlayed} recorded games ·
          Defensive averages allowed per game
        </p>

        {summary.averages && (
          <div className="defensive-summary-grid">
            {[
              ['Pass Yards', summary.averages.passingYards],
              ['Rush Yards', summary.averages.rushingYards],
              ['Pass TDs', summary.averages.passingTDs],
              ['Rush TDs', summary.averages.rushingTDs],
              ['Targets', summary.averages.targets],
              ['Receptions', summary.averages.receptions],
              ['Rec TDs', summary.averages.receivingTDs]
            ].map(([label, value]) => (
              <div className="defensive-stat-card" key={label}>
                <span>{label}</span>
                <strong>{average(value)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="opponent-history">
        <h3>Past Opponents</h3>

        <div className="opponent-buttons">
          {summary.games.map(game => (
            <button
              type="button"
              key={game.gameId}
              className={
                selectedGame?.gameId === game.gameId
                  ? 'opponent-button active'
                  : 'opponent-button'
              }
              onClick={() => setSelectedGameId(game.gameId)}
            >
              <span>Week {game.week}</span>
              <strong>{game.opponent}</strong>
            </button>
          ))}
        </div>
      </section>

      {selectedGame && (
        <section className="opponent-game">
          <div className="opponent-game-header">
            <div>
              <h3>
                Week {selectedGame.week}: {selectedGame.opponent}
                {' '}vs. {selectedTeam}
              </h3>
              <p>
                Individual offensive player statistics
                against {teamNames[selectedTeam]}.
              </p>
            </div>
          </div>

          <div className="game-totals">
            <div>
              <span>Passing Yards</span>
              <strong>{selectedGame.totals.passingYards}</strong>
            </div>
            <div>
              <span>Rushing Yards</span>
              <strong>{selectedGame.totals.rushingYards}</strong>
            </div>
            <div>
              <span>Passing TDs</span>
              <strong>{selectedGame.totals.passingTDs}</strong>
            </div>
            <div>
              <span>Rushing TDs</span>
              <strong>{selectedGame.totals.rushingTDs}</strong>
            </div>
            <div>
              <span>Receiving TDs</span>
              <strong>{selectedGame.totals.receivingTDs}</strong>
            </div>
          </div>

          <div className="category-tabs">
            {['passing', 'rushing', 'receiving'].map(tab => (
              <button
                type="button"
                key={tab}
                className={
                  category === tab
                    ? 'category-tab active'
                    : 'category-tab'
                }
                onClick={() => setCategory(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="player-table-wrapper">
            <table className="player-stat-table">
              <thead>
                <tr>
                  <th>PLAYER</th>
                  <th>POS</th>
                  {categoryColumns[category].map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {activePlayers.map(player => (
                  <tr key={player.id}>
                    <td className="player-name">
                      {onPlayerClick && player.id ? (
                        <button
                          type="button"
                          onClick={() => onPlayerClick(player.id)}
                          title={`View ${player.name}'s 2026 game logs`}
                          style={{
                            padding: 0,
                            background: 'transparent',
                            border: 'none',
                            color: '#8bb8eb',
                            font: 'inherit',
                            fontWeight: 700,
                            textAlign: 'left',
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          {player.name}
                        </button>
                      ) : (
                        player.name
                      )}
                    </td>

                    <td>{player.position}</td>

                    {categoryColumns[category].map(([key]) => (
                      <td key={key}>{player[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {activePlayers.length === 0 && (
              <p className="no-player-data">
                No player activity recorded in this category.
              </p>
            )}
          </div>
        </section>
      )}

      {summary.games.length === 0 && (
        <section className="upcoming-section">
          <p>No recorded games are available for this defense.</p>
        </section>
      )}
    </main>
  )
}

export default DefensiveBreakdown
