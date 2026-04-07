import { db } from "@/lib/db";
import { orders, lines, productionJobs, lineConfigs, moldTargets, lineRules as lineRulesSchema, priorityOrders as priorityOrdersSchema, systemConfig } from "@/db/schema";
import { eq, and, sql, asc, inArray, desc } from "drizzle-orm";
import { groupBOMs } from "@/lib/productionLogic";
import { autoSuggest } from "@/lib/autoRouter";
import ScheduleClient from "./ScheduleClient";

import { syncAllData } from "@/app/api/sync/route";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const lastSyncRow = await db.select().from(systemConfig).where(eq(systemConfig.key, "last_sync"));
  const lastSyncTime = lastSyncRow[0]?.value ? Number(lastSyncRow[0].value) : 0;
  const nowTime = Date.now();
  
  if (nowTime - lastSyncTime > 30 * 60 * 1000) {
    console.log("Auto-syncing data for SchedulePage...");
    try {
        await syncAllData();
        await db.insert(systemConfig).values({ key: "last_sync", value: String(nowTime) })
          .onConflictDoUpdate({ target: systemConfig.key, set: { value: String(nowTime) } });
    } catch (e) {
        console.error("Auto-sync failed", e);
    }
  }

  const allLinesRaw = await db.select().from(lines).where(eq(lines.isActive, true));
  const allowedLines = ['M1', 'M2', 'M3', 'M4', 'M5', 'H1', 'H2'];
  const uniqueLinesMap = new Map();
  allLinesRaw.forEach(l => {
    const code = l.lineCode.toUpperCase();
    if (allowedLines.includes(code) && !uniqueLinesMap.has(code)) {
      uniqueLinesMap.set(code, l);
    }
  });
  const allLines = Array.from(uniqueLinesMap.values()).sort((a, b) => a.lineCode.localeCompare(b.lineCode));
  const configs = await db.select().from(lineConfigs);
  const targets = await db.select().from(moldTargets);
  const rules = await db.select().from(lineRulesSchema);
  const priorityOrders = await db.select().from(priorityOrdersSchema);
  
  const readyOrdersRaw = await db.select().from(orders).where(sql`${orders.rawStatus} IN ('5.WIP IN MOLDING', '5.1.WIP SAU MOLDING')`);

  const readyOrders = readyOrdersRaw.map((o: any) => {
    const orderIdTrimmed = String(o.id || "").trim();
    const priority = priorityOrders.find(p => String(p.orderId || "").trim() === orderIdTrimmed);
    return { 
      ...o, 
      finishDate: priority?.newFinishDate || o.finishDate, 
      isPriority: !!priority 
    };
  });

  const readyGroups = groupBOMs(readyOrders);

  const machineConfigs = allLines.map((l: any) => ({
    ...l,
    machineCount: configs.find(c => c.lineId === l.id)?.machineCount || 8
  }));
  const validTargets = targets.map((t: any) => ({ moldType: t.moldType, targetPerHour: t.targetPerHour || 0 }));
  
  const draftAssignments = autoSuggest(readyGroups, machineConfigs as any, validTargets, rules as any);

  const activeJobs = await db
    .select({
      jobId: productionJobs.id,
      orderId: productionJobs.orderId,
      lineId: productionJobs.lineId,
      status: productionJobs.status,
      estimatedEndTime: productionJobs.estimatedEndTime,
      qty: orders.quantity,
      bom: orders.bom,
      moldType: orders.moldType,
      cuttingDie: orders.cuttingDie,
      rawStatus: orders.rawStatus,
      brand: orders.brand,
      createdAt: productionJobs.createdAt,
      newFinishDate: priorityOrdersSchema.newFinishDate
    })
    .from(productionJobs)
    .innerJoin(orders, eq(productionJobs.orderId, orders.id))
    .leftJoin(priorityOrdersSchema, eq(productionJobs.orderId, priorityOrdersSchema.orderId))
    .where(sql`${productionJobs.status} != 'DONE'`)
    .orderBy(asc(productionJobs.createdAt));

  const scheduleByLine = allLines.map((line: any) => {
    const confirmedJobs = activeJobs.map(j => ({
        ...j,
        estimatedEndTime: j.newFinishDate || j.estimatedEndTime, // Override with priority date
        isPriority: !!j.newFinishDate
    })).filter(j => j.lineId === line.id);

    const predictedGroups = readyGroups.filter(g => draftAssignments[g.id]?.lineId === line.id);
    const lineConfig = configs.find(c => c.lineId === line.id);
    const machineCount = lineConfig?.machineCount || 8;
    
    return {
      id: line.id,
      lineCode: line.lineCode,
      machineCount,
      confirmed: confirmedJobs,
      predicted: predictedGroups.map(g => ({
        id: g.id,
        bom: g.bom,
        totalQuantity: g.totalQuantity,
        items: g.items,
        moldType: g.moldType,
        cuttingDie: g.items[0]?.cuttingDie || '',
        rawStatus: g.items[0]?.rawStatus || '',
        avgFinishDate: g.avgFinishDate,
        minFinishDate: g.items.some((i: any) => i.isPriority) 
                       ? Math.min(...g.items.filter((i: any) => i.isPriority).map((i: any) => new Date(i.finishDate).getTime()))
                       : g.minFinishDate,
        isPriority: g.items.some((i: any) => i.isPriority)
      })),
      draftAssignments,
      isActive: line.isActive
    };
  });

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <header className="max-w-7xl mx-auto mb-16">
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter">Bản Đồ Kế Hoạch Sản Xuất</h1>
        <p className="text-slate-500 font-bold mt-2 uppercase tracking-[0.5em] text-[10px] bg-slate-200 inline-block px-3 py-1 rounded-full">Tomorrow Planning Overview</p>
      </header>

      <ScheduleClient data={scheduleByLine} rawData={readyOrders} />
    </div>
  );
}
