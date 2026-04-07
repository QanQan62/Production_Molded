import { db } from "@/lib/db";
import { orders, priorityOrders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import PriorityClient from "./PriorityClient";

export default async function PriorityPage() {
  // Lấy các đơn đang WIP để có thể setup gầp
  const wipOrders = await db.select().from(orders).where(sql`${orders.rawStatus} IN ('5.WIP IN MOLDING', '5.1.WIP SAU MOLDING', '6.WIP IN LEAN LINE')`);
  const currentPriority = await db.select().from(priorityOrders);

  return (
    <div className="p-8 max-w-5xl mx-auto bg-slate-50 min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      <header className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Đơn hàng Gấp (Priority)</h1>
        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs italic">Điền đơn gấp để thay đổi ngày hoàn thành và đưa lên ưu tiên hàng đầu</p>
      </header>

      <PriorityClient orders={wipOrders} initialPriority={currentPriority} />
    </div>
  );
}
