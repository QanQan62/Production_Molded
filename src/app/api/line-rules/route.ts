import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lineRules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const isStrictValue = body.isStrict !== undefined 
      ? (body.isStrict === true || body.isStrict === 1 || body.isStrict === '1' || body.isStrict === 'true')
      : true;

    await db.insert(lineRules).values({
      lineId: body.lineId,
      ruleType: body.ruleType || 'BRAND',
      ruleValue: body.ruleValue ? String(body.ruleValue).trim() : "",
      isStrict: (isStrictValue ? 1 : 0) as any
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
    const { id, ruleType, ruleValue, isStrict } = body;
    if (!id) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

    const isStrictValue = isStrict !== undefined 
      ? (isStrict === true || isStrict === 1 || isStrict === '1' || isStrict === 'true')
      : true;

    await db.update(lineRules)
      .set({
        ruleType: ruleType,
        ruleValue: ruleValue ? String(ruleValue).trim() : "",
        isStrict: (isStrictValue ? 1 : 0) as any
      })
      .where(eq(lineRules.id, Number(id)));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
