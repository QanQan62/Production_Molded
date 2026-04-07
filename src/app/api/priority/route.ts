import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priorityOrders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await db.insert(priorityOrders).values({
      orderId: body.orderId,
      newFinishDate: body.newFinishDate,
      reason: body.reason || "HÀNG GẤP"
    }).onConflictDoUpdate({
      target: priorityOrders.orderId,
      set: {
        newFinishDate: body.newFinishDate,
        reason: body.reason || "HÀNG GẤP"
      }
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
      await db.delete(priorityOrders).where(eq(priorityOrders.id, id));
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
