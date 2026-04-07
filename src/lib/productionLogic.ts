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

export function groupBOMs(allOrders: Order[]) {
    const moldingOutOrders = allOrders.filter(o => o.moldOutDate && o.bom);
    const moldingInOrders = allOrders.filter(o => !o.moldOutDate && o.moldInDate && o.bom);

  const groupListByDateRule = (orders: Order[]) => {
    const initialGroups: Record<string, Order[]> = {};
    orders.forEach(order => {
      const key = `${order.bom}_${order.status}`;
      if (!initialGroups[key]) initialGroups[key] = [];
      initialGroups[key].push(order);
    });

    const finalSubGroups: any[] = [];
    Object.values(initialGroups).forEach(group => {
      const sorted = [...group].sort((a, b) => new Date(a.moldInDate!).getTime() - new Date(b.moldInDate!).getTime());
      
      let currentSub: Order[] = [];
      let minDate: number | null = null;

      sorted.forEach(order => {
        const orderDate = new Date(order.moldInDate!).getTime();
        const fourDaysInMs = 4 * 24 * 60 * 60 * 1000;

        if (minDate === null || orderDate - minDate > fourDaysInMs) {
          if (currentSub.length > 0) finalSubGroups.push(createGroupMetaData(currentSub));
          currentSub = [order];
          minDate = orderDate;
        } else {
          currentSub.push(order);
        }
      });
      if (currentSub.length > 0) finalSubGroups.push(createGroupMetaData(currentSub));
    });
    return finalSubGroups.sort((a, b) => a.avgFinishDate - b.avgFinishDate);
  };

  const moldingOutGroups = groupListByDateRule(moldingOutOrders).map(g => ({ ...g, type: 'OUT' }));
  const moldingInGroups = groupListByDateRule(moldingInOrders).map(g => ({ ...g, type: 'IN' }));

  // Trả về Out trước In
  return [...moldingOutGroups, ...moldingInGroups];
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
