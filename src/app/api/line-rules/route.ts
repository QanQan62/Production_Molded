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
      ruleValue: body.ruleValue ? String(body.ruleValue).trim() : ""
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (id === "all") {
      await db.delete(lineRules);
    } else if (id) {
       await db.delete(lineRules).where(eq(lineRules.id, Number(id)));
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ruleType, ruleValue } = body;
    if (!id) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

    await db.update(lineRules)
      .set({
        ruleType: ruleType,
        ruleValue: ruleValue ? String(ruleValue).trim() : ""
      })
      .where(eq(lineRules.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
