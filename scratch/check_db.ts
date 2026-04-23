
import { db } from '../src/lib/db';
import { orders, lines, lineRules } from '../src/db/schema';
import { eq, or, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  console.log("DB URL:", process.env.TURSO_DATABASE_URL);
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table';");
  console.log("Tables in DB:", JSON.stringify(tables.rows, null, 2));

  const orderId = 'RPRO-260331-0072';
  console.log(`Checking order: ${orderId}`);
  
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    console.log("Order not found");
  } else {
    console.log("Order details:", JSON.stringify(order, null, 2));
  }

  const allLines = await db.select().from(lines).all();
  console.log("Lines:", JSON.stringify(allLines, null, 2));

  const allRules = await db.select().from(lineRules).all();
  console.log("Rules:", JSON.stringify(allRules, null, 2));
}

check().catch(console.error);
