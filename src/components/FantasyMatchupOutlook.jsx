
import { useState } from 'react'
import { getFantasyLineup } from '../data/teamLineups'
import { getPositionalMatchup } from '../data/positionalMatchups'
import { getRBReceivingMatchup } from '../data/rbReceivingMatchups'
import { getPlayersAgainstDefense, getTeamStats } from '../data/nflCalculations'

const positions = ['QB', 'RB', 'WR', 'TE', 'RB REC']

const formatNumber = value =>
  Number.isFinite(value) ? value.toLocaleString('en-US') : '—'

const formatAverage = (value, decimals = 1) =>
  Number.isFinite(value) ? value.toFixed(decimals) : '—'

// Counts TDs scored by opposing players against this defense.
// Position and scoring type follow the selected fantasy tab.
function getTouchdownsAllowed(defenseId, position) {
  const defenseStats = getTeamStats(defenseId)
  const gamesPlayed = defenseStats?.gamesPlayed ?? 0

  if (!gamesPlayed) return null

  const receivingOnly = position === 'RB REC'
  const playerPosition = receivingOnly ? 'RB' : position
  const touchdownField = position === 'QB'
    ? 'passing_tds'
    : position === 'RB'
      ? 'rushing_tds'
      : 'receiving_tds'

  const total = getPlayersAgainstDefense(defenseId)
    .filter(player => player.position === playerPosition)
    .reduce((sum, player) => {
      const count = Number(player[touchdownField])
      return sum + (Number.isFinite(count) ? count : 0)
    }, 0)

  return {
    total,
    perGame: total / gamesPlayed,
    gamesPlayed,
    typeLabel: position === 'QB'
      ? 'Passing TDs'
      : position === 'RB'
        ? 'Rushing TDs'
        : 'Receiving TDs'
  }
}

function getPlayerStats(player, receivingOnly = false) {
  const stats = player.stats

  if (receivingOnly) {
    return [
      { label: 'TGT', total: stats.targets },
      { label: 'REC', total: stats.receptions },
      { label: 'REC YDS', total: stats.receivingYards },
      {
        label: 'REC TD',
        total: stats.receivingTDs,
        isTouchdown: true
      }
    ]
  }

  if (player.position === 'QB') {
    return [
      { label: 'PASS YDS', total: stats.passingYards },
      {
        label: 'PASS TD',
        total: stats.passingTDs,
        isTouchdown: true
      },
      { label: 'RUSH YDS', total: stats.rushingYards },
      { label: 'INT', total: stats.interceptions }
    ]
  }

  if (player.position === 'RB') {
    return [
      { label: 'RUSH YDS', total: stats.rushingYards },
      {
        label: 'RUSH TD',
        total: stats.rushingTDs,
        isTouchdown: true
      },
      { label: 'REC', total: stats.receptions },
      { label: 'REC YDS', total: stats.receivingYards },
      {
        label: 'REC TD',
        total: stats.receivingTDs,
        isTouchdown: true
      }
    ]
  }

  return [
    { label: 'TGT', total: stats.targets },
    { label: 'REC', total: stats.receptions },
    { label: 'REC YDS', total: stats.receivingYards },
    {
      label: 'REC TD',
      total: stats.receivingTDs,
      isTouchdown: true
    }
  ]
}

function FantasyMatchupOutlook({
  teamId,
  opponentId,
  onPlayerClick
}) {
  const [activePosition, setActivePosition] = useState('WR')

  const receivingOnly = activePosition === 'RB REC'
  const lineupPosition = receivingOnly ? 'RB' : activePosition

  const lineup = getFantasyLineup(teamId)
  const players = lineup[lineupPosition] ?? []

  const matchup = receivingOnly
    ? getRBReceivingMatchup(opponentId)
    : getPositionalMatchup(opponentId, activePosition)

  const touchdownsAllowed = getTouchdownsAllowed(opponentId, activePosition)

  const tierColor = matchup?.tier?.color ?? '#8392a5'
  const tierLabel = matchup?.tier?.label ?? 'Unavailable'

  const matchupRank = matchup?.rank ?? null

  const playerStatCount = receivingOnly
    ? 4
    : activePosition === 'RB'
      ? 5
      : 4

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
            aria-pressed={activePosition === position}
          >
            {position}
          </button>
        ))}
      </div>

      {matchup ? (
        <div
          className={
            receivingOnly
              ? 'fantasy-matchup-summary fantasy-rb-receiving-summary'
              : 'fantasy-matchup-summary'
          }
        >
          <div
            className="fantasy-matchup-dot"
            style={{ backgroundColor: tierColor }}
            title={tierLabel}
          />

          <div className="fantasy-matchup-summary-text">
            <strong>
              {opponentId} vs. {activePosition}
            </strong>

            <small>
              Rank #{matchupRank} · {tierLabel}
            </small>

            {receivingOnly && (
              <small>
                Ranked by RB receiving yards allowed/game
              </small>
            )}
          </div>

          <div className="fantasy-matchup-ppr">
            <strong>
              {receivingOnly
                ? formatAverage(matchup.perGame.receivingYards)
                : formatAverage(matchup.perGame.fantasyPoints)}
            </strong>

            <small>
              {receivingOnly ? 'REC YDS/G' : 'PPR/G'}
            </small>
          </div>
        </div>
      ) : (
        <p className="fantasy-outlook-empty">
          Positional matchup data unavailable.
        </p>
      )}

      {touchdownsAllowed && (
        <div
          style={{
            marginTop: '10px',
            marginBottom: '12px',
            padding: '12px',
            borderRadius: '9px',
            background: '#141b24',
            border: '1px solid #303c4a'
          }}
        >
          <div
            style={{
              color: '#e4eaf2',
              fontSize: '12px',
              fontWeight: '800',
              marginBottom: '10px'
            }}
          >
            {activePosition} TDs Allowed by {opponentId}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '9px'
            }}
          >
            <div
              style={{
                background: '#253140',
                borderRadius: '7px',
                padding: '10px'
              }}
            >
              <small style={{ color: '#aebac9' }}>
                SEASON TOTAL
              </small>
              <div style={{ color: '#e4eaf2', fontSize: '22px', fontWeight: '800' }}>
                {formatNumber(touchdownsAllowed.total)}
              </div>
            </div>

            <div
              style={{
                background: '#253140',
                borderRadius: '7px',
                padding: '10px'
              }}
            >
              <small style={{ color: '#aebac9' }}>
                TDs / GAME
              </small>
              <div style={{ color: '#e4eaf2', fontSize: '22px', fontWeight: '800' }}>
                {formatAverage(touchdownsAllowed.perGame, 2)}
              </div>
            </div>
          </div>

          <small
            style={{
              display: 'block',
              marginTop: '9px',
              color: '#8392a5',
              lineHeight: '1.5'
            }}
          >
            {touchdownsAllowed.typeLabel} scored by opposing {activePosition === 'RB REC' ? 'RBs' : `${activePosition}s`} across {touchdownsAllowed.gamesPlayed} games.
          </small>
        </div>
      )}

      {receivingOnly && matchup && (
        <div className="fantasy-rb-receiving-details">
          <div className="fantasy-rb-receiving-detail">
            <small>RB TGT/G ALLOWED</small>
            <strong>
              {formatAverage(matchup.perGame.targets)}
            </strong>
          </div>

          <div className="fantasy-rb-receiving-detail">
            <small>RB REC/G ALLOWED</small>
            <strong>
              {formatAverage(matchup.perGame.receptions)}
            </strong>
          </div>

          <div className="fantasy-rb-receiving-detail">
            <small>RB REC TD/G ALLOWED</small>
            <strong>
              {formatAverage(
                matchup.perGame.receivingTDs,
                2
              )}
            </strong>
          </div>
        </div>
      )}

      <div className="fantasy-player-list">
        {players.length > 0 ? (
          players.map(player => {
            const games = player.stats.gamesPlayed

            const playerPPR = games
              ? player.stats.fantasyPointsPPR / games
              : 0

            const playerStats = getPlayerStats(
              player,
              receivingOnly
            )

            return (
              <div
                className="fantasy-player-card"
                key={player.id}
              >
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
                      {games}{' '}
                      {games === 1 ? 'game' : 'games'}
                      {receivingOnly ? (
                        <>
                          {' · '}
                          {formatAverage(
                            games
                              ? player.stats.receivingYards / games
                              : 0
                          )}{' '}
                          receiving yards/game
                        </>
                      ) : (
                        <>
                          {' · '}
                          {formatAverage(playerPPR)} PPR/game
                        </>
                      )}
                    </small>
                  </div>

                  <span
                    className="fantasy-player-dot"
                    style={{ backgroundColor: tierColor }}
                    title={
                      `${activePosition} matchup: ${tierLabel}`
                    }
                    aria-label={
                      `${tierLabel} ${activePosition} matchup`
                    }
                  />
                </div>

                <div
                  className={
                    playerStatCount === 5
                      ? 'fantasy-player-stats fantasy-player-stats-five'
                      : 'fantasy-player-stats'
                  }
                >
                  {playerStats.map(stat => {
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
            No recorded {lineupPosition} players
            for this team.
          </p>
        )}
      </div>

      <p className="fantasy-outlook-note">
        Stats show season totals with per-game averages
        in parentheses. Player order reflects 2026 season
        production, not an official depth chart.
        {' '}
        {receivingOnly
          ? 'RB REC ranks defenses only by receiving yards allowed to opposing running backs per game. Rushing production and PPR scoring are excluded from this ranking.'
          : 'QB, RB, WR, and TE matchup colors reflect PPR points allowed to the entire position group, not individual player projections.'}
      </p>
    </div>
  )
}

export default FantasyMatchupOutlook
