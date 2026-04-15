import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moldTargets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const data = await db.select().from(moldTargets);
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { moldType, targetPerHour } = await req.json();
    if (!moldType || targetPerHour === undefined) {
        throw new Error("Missing fields");
    }

    await db.insert(moldTargets).values({
        moldType: moldType.toUpperCase().trim(),
        targetPerHour: Number(targetPerHour)
    }).onConflictDoUpdate({
        target: moldTargets.moldType,
        set: { targetPerHour: Number(targetPerHour) }
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

    await db.delete(moldTargets).where(eq(moldTargets.moldType, id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
