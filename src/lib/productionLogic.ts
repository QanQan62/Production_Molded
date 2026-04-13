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

export function groupBOMs(allOrders: Order[], manualCombines: { orderId: string, combineName: string }[] = [], mode: 'AUTO' | 'MANUAL' = 'AUTO') {
    const manualMap = new Map(manualCombines.map(c => [c.orderId, c.combineName]));
    
    // MODE 2: Manual Mapping Only
    if (mode === 'MANUAL') {
        const manualGroups: Record<string, Order[]> = {};
        const standalone: any[] = [];

        allOrders.forEach(o => {
            const manualName = manualMap.get(o.id);
            if (manualName) {
                if (!manualGroups[manualName]) manualGroups[manualName] = [];
                manualGroups[manualName].push(o);
            } else {
                standalone.push({ ...createGroupMetaData([o]), id: `SOLE_${o.id}` });
            }
        });

        const groupedManual = Object.keys(manualGroups).map(name => ({
            ...createGroupMetaData(manualGroups[name]),
            id: `MANUAL_${name}`,
            isManual: true
        }));

        return [...groupedManual, ...standalone].sort((a, b) => a.minFinishDate - b.minFinishDate);
    }

    // MODE 1: Auto Rule-based Grouping (Standard)
    const moldingOutOrders = allOrders.filter(o => o.moldOutDate && o.bom);
    const moldingInOrders = allOrders.filter(o => !o.moldOutDate && o.moldInDate && o.bom);
    const others = allOrders.filter(o => !o.bom || (!o.moldOutDate && !o.moldInDate));

    const applyStandardRule = (list: Order[]) => {
        const byKey: Record<string, Order[]> = {};
        list.forEach(o => {
            const key = `${o.bom}_${o.logoStatus || 'NO'}`;
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

    const outResults = applyStandardRule(moldingOutOrders);
    const inResults = applyStandardRule(moldingInOrders);
    const otherResults = others.map(o => ({ ...createGroupMetaData([o]), id: `OTHER_${o.id}` }));

    return [...outResults, ...inResults, ...otherResults].sort((a, b) => a.minFinishDate - b.minFinishDate);
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
    type
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
