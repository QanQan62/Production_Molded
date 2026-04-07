import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@libsql/client";

async function checkShared() {
  const client = createClient({
    url: process.env.TURSO_SHARED_URL!,
    authToken: process.env.TURSO_SHARED_TOKEN,
  });

  const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("Shared Tables:", res.rows);
  
  if (res.rows.length === 0) {
      console.log("No tables found in shared DB! Check URL/Token.");
  }
}

checkShared();
