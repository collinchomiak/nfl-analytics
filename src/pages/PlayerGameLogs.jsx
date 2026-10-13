
import { useState } from 'react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import playerData from '../data/playerStats2026.json'
import { getPlayerGameLogs } from '../data/nflCalculations'
import { getPositionalMatchup } from '../data/positionalMatchups'

const number = value => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const categories = {
  passing: {
    label: 'Passing',
    chartField: 'passing_yards',
    fields: [
      ['attempts', 'ATT'],
      ['completions', 'COMP'],
      ['passing_yards', 'YDS'],
      ['passing_tds', 'TD'],
      ['passing_interceptions', 'INT']
    ]
  },
  rushing: {
    label: 'Rushing',
    chartField: 'rushing_yards',
    fields: [
      ['carries', 'ATT'],
      ['rushing_yards', 'YDS'],
      ['rushing_tds', 'TD']
    ]
  },
  receiving: {
    label: 'Receiving',
    chartField: 'receiving_yards',
    fields: [
      ['targets', 'TGT'],
      ['receptions', 'REC'],
      ['receiving_yards', 'YDS'],
      ['receiving_tds', 'TD']
    ]
  }
}

const allPlayers = [...new Map(
  playerData.players
    .filter(player =>
      player.season_type === 'REG' &&
      player.player_id &&
      player.player_display_name
    )
    .map(player => [
      player.player_id,
      {
        id: player.player_id,
        name: player.player_display_name,
        position: player.position,
        team: player.team,
        headshot: player.headshot_url
      }
    ])
).values()]
  .sort((a, b) => a.name.localeCompare(b.name))

// Match defensive difficulty to the player's position.
// If a player's listed position isn't QB, RB, WR, or TE,
// use the selected statistical category instead.

function getMatchupPosition(position, category) {
  if (['QB', 'RB', 'WR', 'TE'].includes(position)) {
    return position
  }

  if (category === 'passing') return 'QB'
  if (category === 'rushing') return 'RB'

  return 'WR'
}

function DefensiveRank({ matchup }) {
  if (!matchup) {
    return <span style={{ color: '#8392a5' }}>—</span>
  }

  const color = matchup.tier?.color ?? '#8392a5'
  const label = matchup.tier?.label ?? 'Unavailable'

  return (
    <div
      title={`#${matchup.rank} vs. ${matchup.position} · ${label} · ${matchup.perGame.fantasyPoints.toFixed(1)} PPR/game allowed`}
      aria-label={`Rank ${matchup.rank}, ${label} matchup`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        whiteSpace: 'nowrap'
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '11px',
          height: '11px',
          minWidth: '11px',
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: '0 0 0 2px rgba(255,255,255,0.04)'
        }}
      />

      <strong
        style={{
          color: '#edf3fa',
          fontSize: '12px',
          fontWeight: '800'
        }}
      >
        #{matchup.rank}
      </strong>
    </div>
  )
}

function PlayerGameLogs({ initialPlayerId = null }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    initialPlayerId || allPlayers[0]?.id || ''
  )

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('receiving')

  const player = allPlayers.find(
    item => item.id === selectedPlayerId
  )

  const games = getPlayerGameLogs(selectedPlayerId)
  const activeCategory = categories[category]
  const gamesPlayed = games.length

  const total = field =>
    games.reduce(
      (sum, game) => sum + number(game[field]),
      0
    )

  const average = field =>
    gamesPlayed ? total(field) / gamesPlayed : 0

  const matchingPlayers = allPlayers.filter(player =>
    `${player.name} ${player.team} ${player.position}`
      .toLowerCase()
      .includes(search.toLowerCase())
  ).slice(0, 40)

  const chartData = games.map(game => ({
    week: `W${game.week}`,
    yards: number(game[activeCategory.chartField])
  }))

  // Calculate the opposing defense's positional matchup
  // for each of this player's recorded games.

  const matchupPosition = getMatchupPosition(
    player?.position,
    category
  )

  const gamesWithMatchups = games.map(game => ({
    ...game,
    defensiveMatchup: getPositionalMatchup(
      game.opponent_team,
      matchupPosition
    )
  }))

  const validMatchups = gamesWithMatchups.filter(
    game => game.defensiveMatchup &&
      Number.isFinite(game.defensiveMatchup.rank)
  )

  const averageOpponentRank = validMatchups.length
    ? validMatchups.reduce(
        (sum, game) => sum + game.defensiveMatchup.rank,
        0
      ) / validMatchups.length
    : null

  const toughGames = validMatchups.filter(
    game => game.defensiveMatchup.rank <= 12
  ).length

  const favorableGames = validMatchups.filter(
    game => game.defensiveMatchup.rank >= 25
  ).length

  return (
    <main className="player-page">
      <header className="player-page-header">
        <span className="eyebrow">2026 NFL Season</span>
        <h2>Individual Player Game Logs</h2>

        <p>
          Explore actual weekly performances, season averages,
          and opposing defenses.
        </p>
      </header>

      <section className="player-search-panel">
        <label htmlFor="player-search">
          Search for a Player
        </label>

        <input
          id="player-search"
          type="text"
          placeholder="Search name, team, or position..."
          value={search}
          onChange={event => setSearch(event.target.value)}
        />

        {search && (
          <div className="player-search-results">
            {matchingPlayers.length ? (
              matchingPlayers.map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setSelectedPlayerId(item.id)
                    setSearch('')
                  }}
                >
                  <strong>{item.name}</strong>
                  <span>
                    {item.position} · {item.team}
                  </span>
                </button>
              ))
            ) : (
              <p>No matching players found.</p>
            )}
          </div>
        )}

        {!search && (
          <select
            value={selectedPlayerId}
            onChange={event => setSelectedPlayerId(event.target.value)}
          >
            {allPlayers.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.position} - {item.team})
              </option>
            ))}
          </select>
        )}
      </section>

      {player && (
        <>
          <section className="player-profile-panel">
            <div className="player-profile-identity">
              {player.headshot && (
                <img
                  src={player.headshot}
                  alt={player.name}
                  className="player-headshot"
                />
              )}

              <div>
                <span className="panel-heading">
                  PLAYER PROFILE
                </span>

                <h3>{player.name}</h3>

                <p>
                  {player.position} · {player.team} ·
                  {' '}{gamesPlayed} recorded games
                </p>
              </div>
            </div>

            <div className="player-season-summary">
              <div>
                <span>Passing Yards / Game</span>
                <strong>
                  {average('passing_yards').toFixed(1)}
                </strong>
              </div>

              <div>
                <span>Rushing Yards / Game</span>
                <strong>
                  {average('rushing_yards').toFixed(1)}
                </strong>
              </div>

              <div>
                <span>Receiving Yards / Game</span>
                <strong>
                  {average('receiving_yards').toFixed(1)}
                </strong>
              </div>

              <div>
                <span>Targets / Game</span>
                <strong>
                  {average('targets').toFixed(1)}
                </strong>
              </div>

              <div>
                <span>Receptions / Game</span>
                <strong>
                  {average('receptions').toFixed(1)}
                </strong>
              </div>

              <div>
                <span>Total TDs</span>
                <strong>
                  {total('passing_tds') +
                    total('rushing_tds') +
                    total('receiving_tds')}
                </strong>
              </div>
            </div>

            {/* Opponent difficulty summary:
                shown ONLY on the Player Game Logs page. */}

            <div
              style={{
                marginTop: '18px',
                padding: '16px',
                background: '#141b24',
                border: '1px solid #303d4d',
                borderRadius: '9px'
              }}
            >
              <div
                style={{
                  color: '#e4eaf2',
                  fontSize: '12px',
                  fontWeight: '800',
                  marginBottom: '13px'
                }}
              >
                Opponent Difficulty · {matchupPosition}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '8px'
                }}
              >
                <div
                  style={{
                    padding: '12px 6px',
                    background: '#202b39',
                    border: '1px solid #354253',
                    borderRadius: '7px',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      color: '#91a4b9',
                      fontSize: '10px',
                      marginBottom: '7px'
                    }}
                  >
                    AVG OPP RANK
                  </div>

                  <strong
                    style={{
                      color: '#edf3fa',
                      fontSize: '20px',
                      fontWeight: '800'
                    }}
                  >
                    {averageOpponentRank === null
                      ? '—'
                      : `#${averageOpponentRank.toFixed(1)}`}
                  </strong>
                </div>

                <div
                  style={{
                    padding: '12px 6px',
                    background: '#202b39',
                    border: '1px solid #354253',
                    borderRadius: '7px',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      color: '#91a4b9',
                      fontSize: '10px',
                      marginBottom: '7px'
                    }}
                  >
                    TOUGH GAMES
                  </div>

                  <strong
                    style={{
                      color: '#EF5350',
                      fontSize: '20px',
                      fontWeight: '800'
                    }}
                  >
                    {toughGames}
                  </strong>

                  <div
                    style={{
                      color: '#8392a5',
                      fontSize: '9px',
                      marginTop: '4px'
                    }}
                  >
                    Ranks #1–12
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 6px',
                    background: '#202b39',
                    border: '1px solid #354253',
                    borderRadius: '7px',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      color: '#91a4b9',
                      fontSize: '10px',
                      marginBottom: '7px'
                    }}
                  >
                    EASY GAMES
                  </div>

                  <strong
                    style={{
                      color: '#39C877',
                      fontSize: '20px',
                      fontWeight: '800'
                    }}
                  >
                    {favorableGames}
                  </strong>

                  <div
                    style={{
                      color: '#8392a5',
                      fontSize: '9px',
                      marginTop: '4px'
                    }}
                  >
                    Ranks #25–32
                  </div>
                </div>
              </div>

              <p
                style={{
                  margin: '12px 0 0',
                  color: '#8392a5',
                  fontSize: '10px',
                  lineHeight: '1.7'
                }}
              >
                Based on current 2026 defensive rankings for
                the {matchupPosition} position group. Lower
                ranks indicate tougher opponents. These are
                season-to-date rankings, not rankings at the
                time each game was played.
              </p>
            </div>
          </section>

          <section className="player-performance-panel">
            <h3>Weekly Performance</h3>

            <div className="player-category-tabs">
              {Object.entries(categories).map(([key, item]) => (
                <button
                  type="button"
                  key={key}
                  className={category === key ? 'active' : ''}
                  onClick={() => setCategory(key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="player-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
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
                    name={`${activeCategory.label} Yards`}
                    fill="#8bb8eb"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <h3>Game-by-Game Statistics</h3>

            <div className="player-game-table-wrapper">
              <table className="player-game-table">
                <thead>
                  <tr>
                    <th>WEEK</th>
                    <th>OPPONENT</th>
                    <th>DEF RANK</th>

                    {activeCategory.fields.map(([field, label]) => (
                      <th key={field}>{label}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {gamesWithMatchups.map(game => (
                    <tr key={game.game_id}>
                      <td>{game.week}</td>

                      <td>{game.opponent_team}</td>

                      <td>
                        <DefensiveRank
                          matchup={game.defensiveMatchup}
                        />
                      </td>

                      {activeCategory.fields.map(([field]) => (
                        <td key={field}>
                          {number(game[field])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="player-data-note">
              Statistics reflect recorded 2026 regular-season
              player performances. Defensive rankings use
              current season-to-date PPR points allowed to
              the player's position group, not rankings at
              game time. No projected player touchdown
              probabilities are used.
            </p>
          </section>
        </>
      )}
    </main>
  )
}

export default PlayerGameLogs
