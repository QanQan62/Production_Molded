import { createClient } from "@libsql/client"; 
import * as dotenv from "dotenv"; 
dotenv.config({ path: ".env.local" }); 

async function run() { 
  const shared = createClient({ 
    url: process.env.TURSO_SHARED_URL!, 
    authToken: process.env.TURSO_SHARED_TOKEN, 
  }); 

  const orders = ['RPRO-260303-0550', 'RPRO-260303-0347'];

  for (const id of orders) {
    const res = await shared.execute({
      sql: `SELECT "PRO ORDER", "Status", "LINE CODE", "BOM", "QtyOrder" FROM "OVN_DATA" WHERE "PRO ORDER" = ?`,
      args: [id]
    });
    console.log(`=== SHARED DB: ${id} ===`);
    console.log(res.rows[0] || 'NOT FOUND');
  }
}
run();
