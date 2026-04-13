import { db } from "@/lib/db";
import { orders, lines, priorityOrders, manualCombines, moldTargets, lineRules as lineRulesSchema } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import DashboardClient from "./DashboardClient";
import { groupBOMs } from "@/lib/productionLogic";
import { autoSuggest } from "@/lib/autoRouter";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const allOrdersRaw = await db.select({
        id: orders.id,
        quantity: orders.quantity,
        finishDate: orders.finishDate,
        sourceLine: orders.sourceLine,
        logoStatus: orders.logoStatus,
        rawStatus: orders.rawStatus,
        leanlineInDate: orders.leanlineInDate,
        brand: orders.brand,
        bom: orders.bom,
        moldType: orders.moldType,
        cuttingDie: orders.cuttingDie,
        productType: orders.productType
    }).from(orders).where(sql`${orders.rawStatus} IN ('5.WIP IN MOLDING', '5.1.WIP SAU MOLDING', '6.WIP IN LEAN LINE', '7.PACKING', '7.1 RETURN LINE', '8.KHO TẠM')`);
    
    const allLines = await db.select().from(lines).where(eq(lines.isActive, true));
    const allPriority = await db.select().from(priorityOrders);

    const manualCombinesData = await db.select().from(manualCombines) as any[];
    const ready5 = allOrdersRaw.filter(o => (o.rawStatus || "").includes('5.'));
    const readyGroups = groupBOMs(ready5 as any, manualCombinesData);
    const targets = await db.select().from(moldTargets);
    const rules = await db.select().from(lineRulesSchema);
    const suggestions = autoSuggest(readyGroups, allLines, targets as any, rules);

    const allOrders = allOrdersRaw.map(o => {
        let plannedLine = null;
        if ((o.rawStatus || "").includes('5.')) {
            const group = readyGroups.find(g => g.items.some((i: any) => i.id === o.id));
            if (group && suggestions[group.id]) {
                const assignedLine = allLines.find(l => l.id === suggestions[group.id].lineId);
                plannedLine = assignedLine?.lineCode;
            }
        }
        return { ...o, plannedLine };
    });

    return (
        <DashboardClient 
            allOrders={allOrders} 
            allLines={allLines} 
            allPriority={allPriority} 
        />
    );
}
