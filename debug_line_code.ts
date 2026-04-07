import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_SHARED_URL!,
  authToken: process.env.TURSO_SHARED_TOKEN!,
});

async function run() {
  const res = await client.execute('SELECT "LINE CODE", Status, COUNT(*) FROM OVN_DATA WHERE Status = "6.WIP IN LEAN LINE" GROUP BY "LINE CODE"');
  console.log(JSON.stringify(res.rows, null, 2));
}

run().catch(console.error);
