import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@libsql/client";

async function verifyRemote() {
  const url = process.env.TURSO_DATABASE_URL!;
  console.log("Checking remote URL:", url);
  
  const client = createClient({
    url: url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("Remote Tables:", res.rows);
  
  if (res.rows.length === 0) {
      console.log("No tables found! drizzle-kit push might have failed or hit wrong DB.");
  }
}

verifyRemote();
