import { createClient } from "@libsql/client"; 
import * as dotenv from "dotenv"; 
dotenv.config({ path: ".env.local" }); 

async function run() { 
  const shared = createClient({ 
    url: process.env.TURSO_SHARED_URL!, 
    authToken: process.env.TURSO_SHARED_TOKEN, 
  }); 
  
  // Get ALL column names
  const res = await shared.execute("SELECT * FROM OVN_DATA LIMIT 1");
  console.log("=== ALL COLUMNS ===");
  res.columns.forEach((c, i) => console.log(`  [${i}] "${c}"`));
  
  // Print the first row with all keys
  if (res.rows[0]) {
    console.log("\n=== FIRST ROW KEYS & VALUES ===");
    const row = res.rows[0];
    for (const [key, value] of Object.entries(row)) {
      if (key.toLowerCase().includes('lean') || key.toLowerCase().includes('last') || key.toLowerCase().includes('line')) {
        console.log(`  KEY="${key}" => VALUE="${value}"`);
      }
    }
  }
}
run();
