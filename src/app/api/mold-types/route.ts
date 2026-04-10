import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moldTypes } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { moldTypes: data } = await req.json();
    if (!Array.isArray(data)) throw new Error("Invalid data");

    const CHUNK_SIZE = 100;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await db.insert(moldTypes).values(chunk).onConflictDoUpdate({
          target: moldTypes.mold,
          set: { type: sql`excluded.type` }
      });
    }

    return NextResponse.json({ success: true, count: data.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
