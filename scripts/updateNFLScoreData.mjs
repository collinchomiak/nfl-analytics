
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile
} from 'node:fs/promises'
import { parse } from 'csv-parse/sync'

const SEASON = 2026

const DATA_URL =
  'https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv'

const OUTPUT_PATH = `src/data/teamScores${SEASON}.json`
const TEMP_PATH = `${OUTPUT_PATH}.tmp`

async function loadExistingData() {
  try {
    return JSON.parse(
      await readFile(OUTPUT_PATH, 'utf8')
    )
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function validScore(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return false
  }

  const score = Number(value)

  return Number.isInteger(score) && score >= 0
}

async function updateNFLScoreData() {
  try {
    console.log(`🏈 Downloading ${SEASON} NFL game scores...`)

    const response = await fetch(DATA_URL, {
      signal: AbortSignal.timeout(60000)
    })

    if (!response.ok) {
      throw new Error(
        `Score download failed: HTTP ${response.status}`
      )
    }

    const csvText = await response.text()

    if (!csvText.trim()) {
      throw new Error('Downloaded schedule CSV is empty.')
    }

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    })

    const requiredFields = [
      'game_id',
      'season',
      'game_type',
      'week',
      'away_team',
      'home_team',
      'away_score',
      'home_score',
      'location'
    ]

    const sample = records[0] ?? {}

    const missingFields = requiredFields.filter(
      field => !(field in sample)
    )

    if (missingFields.length > 0) {
      throw new Error(
        `Missing score columns: ${missingFields.join(', ')}`
      )
    }

    const completedGames = records
      .filter(game =>
        Number(game.season) === SEASON &&
        game.game_type === 'REG' &&
        validScore(game.away_score) &&
        validScore(game.home_score)
      )
      .map(game => ({
        gameId: game.game_id,
        week: Number(game.week),
        awayTeam: game.away_team,
        homeTeam: game.home_team,
        awayScore: Number(game.away_score),
        homeScore: Number(game.home_score),
        location: String(game.location).trim(),
        neutralSite:
          String(game.location).trim().toLowerCase() ===
          'neutral'
      }))
      .filter(game =>
        game.gameId &&
        Number.isInteger(game.week) &&
        game.week >= 1 &&
        game.week <= 18 &&
        game.awayTeam &&
        game.homeTeam &&
        game.awayTeam !== game.homeTeam &&
        ['Home', 'Neutral'].includes(game.location)
      )
      .sort((a, b) =>
        a.week - b.week ||
        a.gameId.localeCompare(b.gameId)
      )

    if (completedGames.length === 0) {
      throw new Error(
        'No completed regular-season games found.'
      )
    }

    const gameIds = new Set(
      completedGames.map(game => game.gameId)
    )

    if (gameIds.size !== completedGames.length) {
      throw new Error(
        'Duplicate game IDs found in scoring data.'
      )
    }

    const existingData = await loadExistingData()
    const previousGames = existingData?.games ?? []

    if (
      existingData &&
      existingData.season !== SEASON
    ) {
      throw new Error(
        'Existing scoring file has a different season.'
      )
    }

    const previousIds = new Set(
      previousGames.map(game => game.gameId)
    )

    const missingPreviousGames = [...previousIds].filter(
      id => !gameIds.has(id)
    )

    if (missingPreviousGames.length > 0) {
      throw new Error(
        `${missingPreviousGames.length} previously recorded ` +
        'games are missing from the download.'
      )
    }

    if (
      existingData &&
      JSON.stringify(previousGames) ===
        JSON.stringify(completedGames)
    ) {
      console.log('✅ Game scores are unchanged.')
      console.log('✅ No file update necessary.')
      return
    }

    const output = {
      season: SEASON,
      updatedAt: new Date().toISOString(),
      games: completedGames
    }

    await mkdir('src/data', { recursive: true })

    try {
      await writeFile(
        TEMP_PATH,
        JSON.stringify(output, null, 2),
        'utf8'
      )

      await rename(TEMP_PATH, OUTPUT_PATH)
    } finally {
      await rm(TEMP_PATH, { force: true })
    }

    const neutralGames = completedGames.filter(
      game => game.neutralSite
    )

    console.log('✅ NFL scoring data saved!')
    console.log(
      `✅ ${completedGames.length} completed games`
    )
    console.log(
      `✅ ${neutralGames.length} neutral-site games`
    )
    console.log(`✅ File: ${OUTPUT_PATH}`)
  } catch (error) {
    console.error(
      '❌ NFL scoring update failed:',
      error.message
    )

    process.exitCode = 1
  }
}

updateNFLScoreData()
