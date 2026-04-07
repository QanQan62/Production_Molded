import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./src/lib/db";
import { sql } from "drizzle-orm";

async function inspect() {
  const tables = await db.all(sql`SELECT name FROM sqlite_master WHERE type='table'`);
  console.log("Local Tables:", tables);
}

inspect();
