import { db } from "@/lib/db";
import { orders, priorityOrders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import PriorityClient from "./PriorityClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PriorityPage() {
  // Lấy tất cả các đơn để đảm bảo hiển thị đủ thông tin trong bảng setup
  const allOrders = await db.select().from(orders);
  const currentPriority = await db.select().from(priorityOrders);

  return (
    <div className="p-8 max-w-5xl mx-auto bg-slate-50 min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      <header className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Đơn hàng Gấp (Priority)</h1>
        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs italic">Điền đơn gấp để thay đổi ngày hoàn thành và đưa lên ưu tiên hàng đầu</p>
      </header>

      <PriorityClient orders={allOrders} initialPriority={currentPriority} />
    </div>
  );
}
