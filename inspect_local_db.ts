import { db } from "./src/lib/db";
import { sql } from "drizzle-orm";

async function inspect() {
  try {
    const tables = await db.all(sql`SELECT name FROM sqlite_master WHERE type='table'`);
    console.log("Existing tables:", tables);
    
    // Check line_rules
    try {
        const lineRulesCols = await db.all(sql`PRAGMA table_info(line_rules)`);
        console.log("line_rules columns:", lineRulesCols);
    } catch (e) {
        console.log("line_rules table does not exist or error.");
    }

    // Check orders columns
    const orderCols = await db.all(sql`PRAGMA table_info(orders)`);
    console.log("orders columns:", orderCols);
  } catch (e) {
    console.error(e);
  }
}

inspect();
