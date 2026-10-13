
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
  `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${SEASON}.csv`

const OUTPUT_PATH = `src/data/playerStats${SEASON}.json`
const TEMP_PATH = `${OUTPUT_PATH}.tmp`

async function loadExistingData() {
  try {
    const contents = await readFile(OUTPUT_PATH, 'utf8')
    return JSON.parse(contents)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

function latestWeek(players) {
  return Math.max(
    0,
    ...players.map(player => Number(player.week) || 0)
  )
}

async function updateNFLData() {
  try {
    console.log(`🏈 Downloading ${SEASON} NFL player statistics...`)

    const response = await fetch(DATA_URL, {
      signal: AbortSignal.timeout(60000)
    })

    if (!response.ok) {
      throw new Error(
        `Download failed: HTTP ${response.status}`
      )
    }

    const csvText = await response.text()

    if (!csvText.trim()) {
      throw new Error('Downloaded CSV is empty.')
    }

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    })

    const regularSeason = records.filter(
      row =>
        row.season_type === 'REG' ||
        row.season_type === 'REGULAR'
    )

    console.log(
      `Found ${regularSeason.length} regular-season player-week records.`
    )

    if (regularSeason.length === 0) {
      throw new Error(
        'No regular-season records found. Existing data preserved.'
      )
    }

    const requiredFields = [
      'player_id',
      'player_display_name',
      'position',
      'team',
      'opponent_team',
      'game_id',
      'week',
      'season_type',
      'fantasy_points_ppr'
    ]

    const sample = regularSeason[0]

    const missingFields = requiredFields.filter(
      field => !(field in sample)
    )

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required columns: ${missingFields.join(', ')}`
      )
    }

    const existingData = await loadExistingData()
    const previousPlayers = existingData?.players ?? []

    if (
      existingData &&
      existingData.season !== SEASON
    ) {
      throw new Error(
        'Existing data belongs to a different season.'
      )
    }

    if (
      previousPlayers.length > 0 &&
      regularSeason.length < previousPlayers.length
    ) {
      throw new Error(
        'Downloaded data contains fewer player-week records ' +
        'than the existing dataset. Update rejected for review.'
      )
    }

    const previousWeek = latestWeek(previousPlayers)
    const downloadedWeek = latestWeek(regularSeason)

    if (downloadedWeek < previousWeek) {
      throw new Error(
        `Downloaded latest week ${downloadedWeek} is older ` +
        `than existing latest week ${previousWeek}.`
      )
    }

    const previousStats = JSON.stringify(previousPlayers)
    const downloadedStats = JSON.stringify(regularSeason)

    if (existingData && previousStats === downloadedStats) {
      console.log('✅ Statistics are unchanged.')
      console.log('✅ No file update necessary.')
      return
    }

    const output = {
      season: SEASON,
      updatedAt: new Date().toISOString(),
      players: regularSeason
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

    console.log('✅ New statistics saved successfully!')
    console.log(
      `✅ ${regularSeason.length} player-week records`
    )
    console.log(`✅ Latest recorded week: ${downloadedWeek}`)
    console.log(`✅ File: ${OUTPUT_PATH}`)
  } catch (error) {
    console.error('❌ NFL data update failed:', error.message)
    process.exitCode = 1
  }
}

updateNFLData()
