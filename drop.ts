import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function clearTables() {
  try {
    await client.execute("DROP TABLE IF EXISTS production_jobs");
    console.log("Dropped production_jobs table");
    await client.execute("DROP TABLE IF EXISTS orders");
    console.log("Dropped orders table");
  } catch (error) {
    console.error("Error dropping tables:", error);
  }
}

clearTables();
