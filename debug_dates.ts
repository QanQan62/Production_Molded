import { createClient } from "@libsql/client"; 
import * as dotenv from "dotenv"; 
dotenv.config({ path: ".env.local" }); 

async function run() { 
  const local = createClient({ 
    url: process.env.TURSO_DATABASE_URL!, 
    authToken: process.env.TURSO_AUTH_TOKEN, 
  }); 

  const target = 'RPRO-260303-0347';

  const order = await local.execute({
    sql: "SELECT id, finish_date, raw_status FROM orders WHERE id = ?",
    args: [target]
  });
  console.log("=== ORDER DATA ===");
  console.log(order.rows[0]);

  const priority = await local.execute({
    sql: "SELECT * FROM priority_orders WHERE order_id = ?",
    args: [target]
  });
  console.log("\n=== PRIORITY DATA ===");
  console.log(priority.rows[0]);
  
  const allPriorities = await local.execute("SELECT * FROM priority_orders");
  console.log("\n=== ALL PRIORITIES ===");
  allPriorities.rows.forEach(r => console.log(`  ${r.order_id}: ${r.new_finish_date}`));
}
run();
