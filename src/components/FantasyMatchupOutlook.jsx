
import { useState } from 'react'
import { getFantasyLineup } from '../data/teamLineups'
import { getPositionalMatchup } from '../data/positionalMatchups'

const positions = ['QB', 'RB', 'WR', 'TE']

const formatNumber = value =>
  Number.isFinite(value) ? value.toLocaleString('en-US') : '—'

const formatAverage = (value, decimals = 1) =>
  Number.isFinite(value) ? value.toFixed(decimals) : '—'

function getPlayerStats(player) {
  const stats = player.stats

  if (player.position === 'QB') {
    return [
      { label: 'PASS YDS', total: stats.passingYards },
      { label: 'PASS TD', total: stats.passingTDs, isTouchdown: true },
      { label: 'RUSH YDS', total: stats.rushingYards },
      { label: 'INT', total: stats.interceptions }
    ]
  }

  if (player.position === 'RB') {
    return [
      { label: 'RUSH YDS', total: stats.rushingYards },
      { label: 'RUSH TD', total: stats.rushingTDs, isTouchdown: true },
      { label: 'REC', total: stats.receptions },
      { label: 'REC YDS', total: stats.receivingYards }
    ]
  }

  return [
    { label: 'TGT', total: stats.targets },
    { label: 'REC', total: stats.receptions },
    { label: 'REC YDS', total: stats.receivingYards },
    { label: 'REC TD', total: stats.receivingTDs, isTouchdown: true }
  ]
}

function FantasyMatchupOutlook({
  teamId,
  opponentId,
  onPlayerClick
}) {
  const [activePosition, setActivePosition] = useState('WR')

  const lineup = getFantasyLineup(teamId)
  const players = lineup[activePosition] ?? []
  const matchup = getPositionalMatchup(opponentId, activePosition)

  const tierColor = matchup?.tier?.color ?? '#8392a5'
  const tierLabel = matchup?.tier?.label ?? 'Unavailable'

  return (
    <div className="roster-preview fantasy-outlook">
      <div className="fantasy-outlook-header">
        <span>Fantasy Matchup Outlook</span>
        <p>
          {teamId} offense vs. {opponentId} defense
        </p>
      </div>

      <div
        className="fantasy-outlook-tabs"
        role="group"
        aria-label="Position group"
      >
        {positions.map(position => (
          <button
            type="button"
            key={position}
            className={
              activePosition === position
                ? 'fantasy-outlook-tab active'
                : 'fantasy-outlook-tab'
            }
            onClick={() => setActivePosition(position)}
          >
            {position}
          </button>
        ))}
      </div>

      {matchup ? (
        <div className="fantasy-matchup-summary">
          <div
            className="fantasy-matchup-dot"
            style={{ backgroundColor: tierColor }}
          />

          <div className="fantasy-matchup-summary-text">
            <strong>
              {opponentId} vs. {activePosition}
            </strong>
            <small>
              Rank #{matchup.rank} · {tierLabel}
            </small>
          </div>

          <div className="fantasy-matchup-ppr">
            <strong>
              {formatAverage(matchup.perGame.fantasyPoints)}
            </strong>
            <small>PPR/G</small>
          </div>
        </div>
      ) : (
        <p className="fantasy-outlook-empty">
          Positional matchup data unavailable.
        </p>
      )}

      <div className="fantasy-player-list">
        {players.length > 0 ? (
          players.map(player => {
            const games = player.stats.gamesPlayed

            const playerPPR = games
              ? player.stats.fantasyPointsPPR / games
              : 0

            return (
              <div className="fantasy-player-card" key={player.id}>
                <div className="fantasy-player-heading">
                  <span className="fantasy-player-role">
                    {player.role}
                  </span>

                  <div className="fantasy-player-identity">
                    {onPlayerClick ? (
                      <button
                        type="button"
                        className="fantasy-player-link"
                        onClick={() => onPlayerClick(player.id)}
                        title={`Open ${player.name}'s game logs`}
                      >
                        {player.name}
                      </button>
                    ) : (
                      <strong>{player.name}</strong>
                    )}

                    <small>
                      {games} {games === 1 ? 'game' : 'games'} ·{' '}
                      {formatAverage(playerPPR)} PPR/game
                    </small>
                  </div>

                  <span
                    className="fantasy-player-dot"
                    style={{ backgroundColor: tierColor }}
                    title={`${activePosition} matchup: ${tierLabel}`}
                    aria-label={`${tierLabel} ${activePosition} matchup`}
                  />
                </div>

                <div className="fantasy-player-stats">
                  {getPlayerStats(player).map(stat => {
                    const average = games
                      ? stat.total / games
                      : 0

                    return (
                      <div
                        className="fantasy-player-stat"
                        key={stat.label}
                      >
                        <span className="fantasy-stat-label">
                          {stat.label}
                        </span>

                        <div className="fantasy-stat-values">
                          <strong>
                            {formatNumber(stat.total)}
                          </strong>

                          <small>
                            ({formatAverage(
                              average,
                              stat.isTouchdown ? 2 : 1
                            )}/g)
                          </small>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        ) : (
          <p className="fantasy-outlook-empty">
            No recorded {activePosition} players for this team.
          </p>
        )}
      </div>

      <p className="fantasy-outlook-note">
        Stats show season totals with per-game averages in
        parentheses. Player order reflects 2026 season
        production, not an official depth chart. Matchup
        colors reflect PPR points allowed to the entire
        position group, not individual player projections.
      </p>
    </div>
  )
}

export default FantasyMatchupOutlook
