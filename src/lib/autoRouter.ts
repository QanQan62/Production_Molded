import { groupBOMs, calculateProductionTime } from "./productionLogic";

type BomGroup = ReturnType<typeof groupBOMs>[number];
type Line = {
  id: string;
  lineCode: string;
  isBusy?: boolean;
  machineCount?: number;
};

type MoldTarget = {
  moldType: string;
  targetPerHour: number;
};

export function autoSuggest(
  bomGroups: BomGroup[],
  lines: Line[],
  moldTargets: MoldTarget[],
  lineRules: any[] = []
) {
  const assignments: Record<string, { lineId: string; targetPerHour: number; suggestion: string, isUrgent: boolean }> = {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Khởi tạo tải trọng cho từng chuyền (đơn vị: giờ)
  const lineLoads: Record<string, number> = {};
  lines.forEach(l => { lineLoads[l.id] = 0; });

  bomGroups.forEach(group => {
    const firstItem = group.items[0];
    const brand = (firstItem.brand || "").toUpperCase();
    const mold = (group.moldType || "").toUpperCase();
    const article = (firstItem.articleCode || "").toUpperCase();
    const target = moldTargets.find(t => t.moldType === group.moldType)?.targetPerHour || 0;

    // Chỉ urgent nếu có trong bảng priority (isPriority)
    const isUrgent = group.items.some((i: any) => i.isPriority);

    // 1. Xác định tập các chuyền ứng viên theo Rule (Brand/Mold/Article)
    let candidates: Line[] = [];

    // Tìm các lines có rule khớp với group này
    const matchedRules = lineRules.filter(r => {
       const val = (r.ruleValue || "").toUpperCase();
       if (r.ruleType === 'BRAND') return brand.includes(val);
       if (r.ruleType === 'MOLD') return mold.includes(val);
       if (r.ruleType === 'ARTICLE') return article.includes(val);
       return false;
    });

    if (matchedRules.length > 0) {
        candidates = lines.filter(l => matchedRules.some(r => r.lineId === l.id));
        
        // Overflow: Chỉ được tràn sang M1-M5
        if (isUrgent && candidates.every(c => lineLoads[c.id] > 12)) {
             candidates.push(...lines.filter(l => ['M1', 'M2', 'M3', 'M4', 'M5'].includes(l.lineCode) && lineLoads[l.id] < 5));
        }
    } else {
        // Hàng không có rule cụ thể: Ưu tiên M5 (theo thói quen xưởng)
        candidates = lines.filter(l => l.lineCode === 'M5');
        // Nếu M5 đầy, cho phép nhảy sang M1-M4
        if (isUrgent && (candidates.length === 0 || candidates.every(c => lineLoads[c.id] > 10))) {
             candidates = lines.filter(l => ['M1', 'M2', 'M3', 'M4', 'M5'].includes(l.lineCode));
        }
    }

    // Luôn giữ rule đặc biệt cho H2: H2 chỉ chạy OE-0656 và OE-1429 nếu không có rule cụ thể
    if (mold === 'OE-0656' || mold === 'OE-1429') {
       candidates = lines.filter(l => l.lineCode === 'H2');
    } else {
       // Ngược lại, KHÔNG cho phép hàng khác vào H2 trừ khi có rule gán trực tiếp đã chạy ở trên
       candidates = candidates.filter(l => l.lineCode !== 'H2');
    }

    // 2. Chọn chuyền rảnh nhất trong tập ứng viên
    let selectedLine = candidates.sort((a, b) => lineLoads[a.id] - lineLoads[b.id])[0];
    
    if (!selectedLine) {
       // Fallback: Tuyệt đối không vào H2, H1 nếu không có chỉ định
       selectedLine = lines.filter(l => !['H1', 'H2'].includes(l.lineCode))
                           .sort((a, b) => lineLoads[a.id] - lineLoads[b.id])[0];
    }
    
    // Nếu vẫn không có (ví dụ tất cả lines là H1/H2), lấy đại cái đầu tiên
    if (!selectedLine) selectedLine = lines[0];

    if (selectedLine && target > 0) {
      const machineCount = selectedLine.machineCount || 8;
      const prodTime = calculateProductionTime(group.totalQuantity, target, machineCount);
      
      assignments[group.id] = {
        lineId: selectedLine.id,
        targetPerHour: target,
        suggestion: prodTime.suggestion,
        isUrgent
      };

      lineLoads[selectedLine.id] += prodTime.totalHours;
    } else {
      assignments[group.id] = {
        lineId: "",
        targetPerHour: target,
        suggestion: "",
        isUrgent
      };
    }
  });

  return assignments;
}
