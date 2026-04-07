import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { syncAllData } from "./src/app/api/sync/route";

async function runSync() {
  try {
    const res = await syncAllData();
    console.log("Sync Result:", res);
  } catch (e) {
    console.error("Sync Error:", e);
  }
}

runSync();
