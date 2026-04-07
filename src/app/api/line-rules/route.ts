import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lineRules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await db.insert(lineRules).values({
      lineId: body.lineId,
      ruleType: body.ruleType || 'BRAND',
      ruleValue: body.ruleValue ? body.ruleValue.trim() : body.brand.trim()
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (id) {
      await db.delete(lineRules).where(eq(lineRules.id, id));
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
