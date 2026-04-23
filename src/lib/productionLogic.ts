import { orders } from "@/db/schema";

type Order = typeof orders.$inferSelect;

/**
 * Tính toán tổng giờ làm việc hiệu dụng dựa trên giờ tăng ca.
 */
export function calculateEffectiveHours(otHours: number, isNightShift: boolean = false) {
  const baseHours = isNightShift ? 7.0 : 7.25;
  const breakDeduction = otHours > 2 ? 0.5 : 0;
  return baseHours + otHours - breakDeduction;
}

/**
 * Gom nhóm đơn hàng theo quy tắc xưởng:
 * 1. Tách riêng Molding Out (có Out) và Molding In (chỉ có In).
 * 2. Ưu tiên Molding Out trước.
 */
function parseExcelDate(dateStr: any) {
  if (!dateStr) return null;
  // If it's already a date object or timestamp
  if (dateStr instanceof Date) return dateStr;
  
  const num = Number(dateStr);
  if (!isNaN(num) && num > 0) {
    if (num < 1000000) { // Excel serial date
      const epoch = new Date(1899, 11, 30);
      return new Date(epoch.getTime() + num * 24 * 60 * 60 * 1000);
    }
    return new Date(num); // Timestamp
  }
  
  // Try YYYY-MM-DD
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function groupBOMs(
    allOrders: Order[],
    manualCombines: { orderId: string, combineName: string }[] = [],
    mode: 'AUTO' | 'MANUAL' | 'SEMI_AUTO' = 'AUTO',
    excludedMolds: string[] = []
) {
    const manualMap = new Map(manualCombines.map(c => [String(c.orderId).trim(), String(c.combineName).trim()]));
    
    // --- STEP 1: Process Manual Groups ---
    const manualGroups: Record<string, Order[]> = {};
    const remainingOrders: Order[] = [];

    allOrders.forEach(o => {
        const manualName = manualMap.get(String(o.id).trim());
        if (manualName) {
            if (!manualGroups[manualName]) manualGroups[manualName] = [];
            manualGroups[manualName].push(o);
        } else {
            remainingOrders.push(o);
        }
    });

    const manualResult = Object.keys(manualGroups).map(name => ({
        ...createGroupMetaData(manualGroups[name]),
        id: `MANUAL_${name}`,
        bom: `COMBINE: ${name}`,
        isManual: true
    }));

    // Define applyStandardRule early so it can be used by both SEMI_AUTO and AUTO paths
    const applyStandardRule = (list: Order[]) => {
        const byKey: Record<string, Order[]> = {};
        list.forEach(o => {
            const key = `${o.bom}_${(o.articleCode || '').toUpperCase().trim()}_${o.logoStatus || 'NO'}`;
            if (!byKey[key]) byKey[key] = [];
            byKey[key].push(o);
        });

        const final: any[] = [];
        Object.values(byKey).forEach(grp => {
            const sorted = grp.sort((a,b) => (parseExcelDate(a.moldInDate)?.getTime() || 0) - (parseExcelDate(b.moldInDate)?.getTime() || 0));
            let sub: Order[] = [];
            let minD: number | null = null;

            sorted.forEach(order => {
                const curD = parseExcelDate(order.moldInDate)?.getTime() || 0;
                if (minD === null || curD - minD > (4 * 24 * 60 * 60 * 1000)) {
                    if (sub.length > 0) final.push(createGroupMetaData(sub));
                    sub = [order];
                    minD = curD;
                } else {
                    sub.push(order);
                }
            });
            if (sub.length > 0) final.push(createGroupMetaData(sub));
        });
        return final;
    };

    if (mode === 'MANUAL') {
        // In strictly manual mode, remaining ones are standalone
        const standaloneResult = remainingOrders.map(o => ({ 
            ...createGroupMetaData([o]), 
            id: `SOLE_${o.id}` 
        }));
        return [...manualResult, ...standaloneResult].sort((a, b) => a.minFinishDate - b.minFinishDate);
    }

    if (mode === 'SEMI_AUTO') {
        // In semi-auto mode: orders whose moldType is in excludedMolds → standalone (no auto combine)
        // All other orders → auto combine as usual
        const normalizedExcluded = excludedMolds.map(m => m.toUpperCase().trim());
        const excludedOrders = remainingOrders.filter(o =>
            normalizedExcluded.includes((o.moldType || "").toUpperCase().trim())
        );
        const includedOrders = remainingOrders.filter(o =>
            !normalizedExcluded.includes((o.moldType || "").toUpperCase().trim())
        );

        const excludedStandalone = excludedOrders.map(o => ({
            ...createGroupMetaData([o]),
            id: `EXCL_${o.id}`
        }));

        const moldingOutIncluded = includedOrders.filter(o => o.moldOutDate && o.bom);
        const moldingInIncluded = includedOrders.filter(o => !o.moldOutDate && o.moldInDate && o.bom);
        const othersIncluded = includedOrders.filter(o => !o.bom || (!o.moldOutDate && !o.moldInDate));

        const semiAutoResults = [
            ...applyStandardRule(moldingOutIncluded),
            ...applyStandardRule(moldingInIncluded)
        ];
        const othersSemiResult = othersIncluded.map(o => ({ ...createGroupMetaData([o]), id: `OTHER_${o.id}` }));

        return [
            ...manualResult,
            ...excludedStandalone,
            ...semiAutoResults,
            ...othersSemiResult
        ].sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            return a.minFinishDate - b.minFinishDate;
        });
    }

    // --- STEP 2: Process Auto Groups for the rest ---
    const moldingOutOrders = remainingOrders.filter(o => o.moldOutDate && o.bom);
    const moldingInOrders = remainingOrders.filter(o => !o.moldOutDate && o.moldInDate && o.bom);
    const others = remainingOrders.filter(o => !o.bom || (!o.moldOutDate && !o.moldInDate));

    const autoResults = [...applyStandardRule(moldingOutOrders), ...applyStandardRule(moldingInOrders)];
    const otherResults = others.map(o => ({ ...createGroupMetaData([o]), id: `OTHER_${o.id}` }));

    return [...manualResult, ...autoResults, ...otherResults].sort((a, b) => {
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        return a.minFinishDate - b.minFinishDate;
    });
}

function createGroupMetaData(items: Order[]) {
  const finishDates = items.map(i => {
    const d = parseExcelDate(i.finishDate || i.moldInDate);
    return d ? d.getTime() : 0;
  });
  const avgFinishDate = finishDates.reduce((a, b) => a + b, 0) / items.length;
  const minFinishDate = Math.min(...finishDates);
  
  const type = items[0].moldOutDate ? 'OUT' : 'IN';

  return {
    id: `${items[0].bom}_${type}_${avgFinishDate}_${items[0].id}`,
    bom: items[0].bom || "UNKNOWN",
    moldType: items[0].moldType || "UNKNOWN",
    status: items[0].status || "PENDING",
    items,
    totalQuantity: items.reduce((sum, i) => sum + (i.quantity || 0), 0),
    avgFinishDate,
    minFinishDate,
    type,
    isPriority: items.some((i: any) => i.isPriority),
    // Add missing UI fields
    cuttingDie: items[0].cuttingDie || "",
    rawStatus: items[0].rawStatus || "",
    logoStatus: items[0].logoStatus || undefined,
    descriptionPU1: items[0].descriptionPU1 || "",
    descriptionFB: items[0].descriptionFB || "",
    productType: items[0].productType || ""
  };
}

/**
 * Tính toán thời gian sản xuất và gợi ý tách đơn.
 */
export function calculateProductionTime(totalQty: number, targetPerHour: number, machineCount: number) {
  if (targetPerHour <= 0 || machineCount <= 0) return { totalHours: 0, days: 0, suggestion: "" };

  const totalHours = totalQty / (targetPerHour * machineCount);
  const maxDayHours = calculateEffectiveHours(2); // OT = 2
  const maxShiftHours = 7.25 + 7 + 2; // Ngày + Đêm + OT

  if (totalHours > maxShiftHours) {
    const days = Math.ceil(totalHours / maxDayHours);
    return {
      totalHours,
      days,
      suggestion: `Chạy trong ${days} ngày trên cùng chuyền`
    };
  }

  return { totalHours, days: 1, suggestion: "" };
}
