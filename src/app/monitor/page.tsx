import { db } from "@/lib/db";
import { lines, productionJobs, orders, systemConfig } from "@/db/schema";
import { eq, desc, or } from "drizzle-orm";
import MonitorClient from "./MonitorClient";
import { syncAllData } from "@/app/api/sync/route";

export const dynamic = "force-dynamic";

export default async function MonitorPage() {
  // Check last sync
  const lastSyncRow = await db.select().from(systemConfig).where(eq(systemConfig.key, "last_sync"));
  const lastSyncTime = lastSyncRow[0]?.value ? Number(lastSyncRow[0].value) : 0;
  const nowTime = Date.now();
  
  if (nowTime - lastSyncTime > 30 * 60 * 1000) {
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
  // Keep only unique line codes, prefer existing uppercase or the first one found
  const uniqueLinesMap = new Map();
  allLinesRaw.forEach(l => {
    const code = l.lineCode.toUpperCase();
    if (allowedLines.includes(code) && !uniqueLinesMap.has(code)) {
      uniqueLinesMap.set(code, l);
    }
  });
  const allLines = Array.from(uniqueLinesMap.values()).sort((a, b) => a.lineCode.localeCompare(b.lineCode));

  const priorityOrders = await db.select().from(require('@/db/schema').priorityOrders);
  const targets = await db.select().from(require('@/db/schema').moldTargets);

  const activeOrdersAtLeanline = await db
    .select({
      orderId: orders.id,
      bom: orders.bom,
      articleCode: orders.articleCode,
      quantity: orders.quantity,
      rawStatus: orders.rawStatus,
      sourceLine: orders.sourceLine,
      finishDate: orders.finishDate,
      moldType: orders.moldType,
      leanlineInDate: orders.leanlineInDate,
      cuttingDie: orders.cuttingDie,
      jobId: productionJobs.id,
      jobStatus: productionJobs.status,
      createdAt: productionJobs.createdAt,
      estimatedEndTime: productionJobs.estimatedEndTime,
      plannedLineId: productionJobs.lineId,
    })
    .from(orders)
    .leftJoin(productionJobs, eq(orders.id, productionJobs.orderId))
    .where(eq(orders.rawStatus, "6.WIP IN LEAN LINE"))
    .orderBy(desc(orders.id));

  const linesWithJobs = allLines.map((line: any) => {
    let matchingOrders = activeOrdersAtLeanline.filter((o: any) => o.sourceLine?.toUpperCase() === line.lineCode.toUpperCase());
    if (matchingOrders.length === 0) {
       matchingOrders = activeOrdersAtLeanline.filter((o: any) => o.plannedLineId === line.id);
    }
    
    return {
      line: {
        id: line.id,
        lineCode: line.lineCode,
      },
      activeJobs: matchingOrders.map((orderData: any) => {
        const orderIdTrimmed = String(orderData.orderId || "").trim();
        const priority = priorityOrders.find(p => String(p.orderId || "").trim() === orderIdTrimmed);
        const target = targets.find((t: any) => t.moldType === orderData.moldType);
        
        return {
          job: {
            id: orderData.jobId || 0,
            status: orderData.jobStatus || 'EXTERNAL',
            createdAt: orderData.createdAt,
            estimatedEndTime: orderData.estimatedEndTime,
          },
          order: {
            id: orderData.orderId,
            articleCode: orderData.articleCode,
            quantity: orderData.quantity,
            bom: orderData.bom,
            moldType: orderData.moldType,
            sourceLine: orderData.sourceLine,
            finishDate: priority?.newFinishDate || orderData.finishDate,
            leanlineInDate: orderData.leanlineInDate,
            cuttingDie: orderData.cuttingDie,
            targetPerHour: target ? target.targetPerHour : 0,
            isPriority: !!priority
          },
        };
      }).sort((a: any, b: any) => (a.order.bom || "").localeCompare(b.order.bom || "")),
    };
  });

  return (
    <div className="p-8 bg-slate-50 min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      <header className="max-w-7xl mx-auto mb-12">
        <h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase italic">Giám Sát Xưởng</h1>
        <p className="text-slate-500 font-bold mt-2 uppercase tracking-[0.5em] text-[10px] bg-slate-200 inline-block px-3 py-1 rounded-full italic">Live Monitoring</p>
      </header>

      <div className="max-w-7xl mx-auto">
        <MonitorClient initialLines={linesWithJobs as any} rawData={activeOrdersAtLeanline as any} />
      </div>
    </div>
  );
}
