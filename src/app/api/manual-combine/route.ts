import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { manualCombines } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { combines } = await req.json();
    if (!Array.isArray(combines)) throw new Error("Invalid data");

    // Clear existing
    await db.delete(manualCombines);

    const CHUNK_SIZE = 100;
    for (let i = 0; i < combines.length; i += CHUNK_SIZE) {
      const chunk = combines.slice(i, i + CHUNK_SIZE);
      await db.insert(manualCombines).values(chunk);
    }

    return NextResponse.json({ success: true, count: combines.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
