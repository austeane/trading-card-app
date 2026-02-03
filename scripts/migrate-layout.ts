/**
 * Migration script to add layout field to existing rendered cards.
 * 
 * This script queries all rendered cards and adds the USQC26_LAYOUT_V1 layout
 * to the renderMeta.templateSnapshot.layout field if it's missing.
 * 
 * Usage: AWS_PROFILE=prod npx tsx scripts/migrate-layout.ts
 * 
 * Options:
 *   --dry-run    Preview changes without writing to DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { USQC26_LAYOUT_V1 } from 'shared'

const TABLE_NAME = process.env.TABLE_NAME ?? 'austin-site-production-trading-cards-Cards'
const DRY_RUN = process.argv.includes('--dry-run')

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }))

async function queryRenderedCards() {
  const cards: Array<{ id: string; renderMeta?: unknown }> = []
  let lastKey: Record<string, unknown> | undefined

  do {
    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'byStatus',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'rendered',
        },
        ProjectionExpression: 'id, renderMeta',
        ExclusiveStartKey: lastKey,
      })
    )

    if (result.Items) {
      cards.push(...(result.Items as typeof cards))
    }
    lastKey = result.LastEvaluatedKey
  } while (lastKey)

  return cards
}

async function migrateCard(card: { id: string; renderMeta?: unknown }) {
  const renderMeta = card.renderMeta as Record<string, unknown> | undefined
  if (!renderMeta) {
    console.log(`  Skipping ${card.id}: no renderMeta`)
    return false
  }

  const templateSnapshot = renderMeta.templateSnapshot as Record<string, unknown> | undefined
  if (!templateSnapshot) {
    console.log(`  Skipping ${card.id}: no templateSnapshot`)
    return false
  }

  if (templateSnapshot.layout) {
    console.log(`  Skipping ${card.id}: already has layout`)
    return false
  }

  console.log(`  ${DRY_RUN ? '[DRY RUN] Would update' : 'Updating'} ${card.id}`)

  if (!DRY_RUN) {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id: card.id },
        UpdateExpression: 'SET renderMeta.templateSnapshot.#layout = :layout',
        ExpressionAttributeNames: {
          '#layout': 'layout',
        },
        ExpressionAttributeValues: {
          ':layout': USQC26_LAYOUT_V1,
        },
      })
    )
  }

  return true
}

async function main() {
  console.log('Migrate Layout Script')
  console.log('=====================')
  console.log(`Table: ${TABLE_NAME}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log()

  console.log('Querying rendered cards...')
  const cards = await queryRenderedCards()
  console.log(`Found ${cards.length} rendered cards`)
  console.log()

  let updated = 0
  let skipped = 0

  for (const card of cards) {
    const wasUpdated = await migrateCard(card)
    if (wasUpdated) {
      updated++
    } else {
      skipped++
    }
  }

  console.log()
  console.log('Summary')
  console.log('-------')
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Total: ${cards.length}`)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
