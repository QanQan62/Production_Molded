import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moldTypes } from "@/db/schema";
import { eq, like, or } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    
    let query = db.select().from(moldTypes);
    
    if (search) {
        query = query.where(
            or(
                like(moldTypes.mold, `%${search}%`),
                like(moldTypes.type, `%${search}%`)
            )
        ) as any;
    }
    
    const data = await query.limit(500); // Limit to 500 rows to prevent overwhelming UI
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { mold, type } = await req.json();
    if (!mold || !type) {
        throw new Error("Missing fields");
    }

    await db.insert(moldTypes).values({
        mold: mold.toUpperCase().trim(),
        type: type.toUpperCase().trim()
    }).onConflictDoUpdate({
        target: moldTypes.mold,
        set: { type: type.toUpperCase().trim() }
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) throw new Error("Missing id");

    await db.delete(moldTypes).where(eq(moldTypes.mold, id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
