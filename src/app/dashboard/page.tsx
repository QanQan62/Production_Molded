import { db } from "@/lib/db";
import { orders, lines, priorityOrders } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
    const allOrders = await db.select({
        id: orders.id,
        quantity: orders.quantity,
        finishDate: orders.finishDate,
        sourceLine: orders.sourceLine,
        logoStatus: orders.logoStatus,
        rawStatus: orders.rawStatus,
        leanlineInDate: orders.leanlineInDate,
        brand: orders.brand
    }).from(orders).where(sql`${orders.rawStatus} IN ('5.WIP IN MOLDING', '5.1.WIP SAU MOLDING', '6.WIP IN LEAN LINE', '7.PACKING', '7.1 RETURN LINE', '8.KHO TẠM')`);
    
    const allLines = await db.select().from(lines).where(eq(lines.isActive, true));
    const allPriority = await db.select().from(priorityOrders);

    return (
        <DashboardClient 
            allOrders={allOrders} 
            allLines={allLines} 
            allPriority={allPriority} 
        />
    );
}
