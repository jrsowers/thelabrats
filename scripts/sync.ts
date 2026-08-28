/** Run the ESPN -> Postgres sync locally: npm run sync */
import { syncLeague } from '../src/lib/ingest/syncLeague'

async function main() {
  const result = await syncLeague()
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 1)
}

void main()
