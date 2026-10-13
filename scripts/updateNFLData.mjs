
import { mkdir, writeFile } from 'node:fs/promises'
import { parse } from 'csv-parse/sync'

const SEASON = 2026

const DATA_URL =
  `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_${SEASON}.csv`

async function updateNFLData() {
  try {
    console.log(`🏈 Downloading ${SEASON} NFL player statistics...`)

    const response = await fetch(DATA_URL)

    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`)
    }

    const csvText = await response.text()

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    })

    const regularSeason = records.filter(
      row => row.season_type === 'REG' ||
             row.season_type === 'REGULAR'
    )

    const output = {
      season: SEASON,
      updatedAt: new Date().toISOString(),
      players: regularSeason
    }

    await mkdir('src/data', { recursive: true })

    await writeFile(
      'src/data/playerStats2026.json',
      JSON.stringify(output, null, 2)
    )

    console.log('✅ Download complete!')
    console.log(`✅ Loaded ${regularSeason.length} player-week records`)
    console.log('✅ Saved to src/data/playerStats2026.json')

    if (regularSeason.length === 0) {
      console.warn(
        '⚠️ No regular-season records matched. Check season_type values.'
      )
    }
  } catch (error) {
    console.error('❌ Data update failed:', error.message)
    process.exitCode = 1
  }
}

updateNFLData()
