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

  const lineLoads: Record<string, number> = {};
  lines.forEach(l => { lineLoads[l.id] = 0; });

  bomGroups.forEach(group => {
    const firstItem = group.items[0];
    const brand = (firstItem.brand || "").toUpperCase();
    const mold = (group.moldType || "").toUpperCase();
    const article = (firstItem.articleCode || "").toUpperCase();
    const productType = (firstItem.productType || "").toUpperCase();
    const thangHoa = (firstItem.thangHoa || "").trim() !== "" ? "CÓ" : "KHÔNG";
    const totalQty = group.totalQuantity;
    const target = moldTargets.find(t => t.moldType === group.moldType)?.targetPerHour || 0;

    const isUrgent = group.items.some((i: any) => i.isPriority);

    // 1. Xác định tập các chuyền ứng viên theo Rule
    let candidates: Line[] = [];

    const matchedRules = lineRules.filter(r => {
       const val = (r.ruleValue || "").toUpperCase().trim();
       if (r.ruleType === 'BRAND') return brand.includes(val);
       if (r.ruleType === 'MOLD') return mold.includes(val);
       if (r.ruleType === 'ARTICLE') return article.includes(val);
       if (r.ruleType === 'PRODUCT_TYPE') return productType === val;
       if (r.ruleType === 'THANG_HOA') return thangHoa === val;
       if (r.ruleType === 'TOTAL_QTY_GT') return totalQty > Number(val);
       if (r.ruleType === 'TOTAL_QTY_LT') return totalQty < Number(val);
       if (r.ruleType === 'TOTAL_QTY_RANGE') {
           const parts = val.split('-');
           if (parts.length === 2) {
               const min = Number(parts[0]);
               const max = Number(parts[1]);
               return totalQty >= min && totalQty <= max;
           }
       }
       return false;
    });

    // Đặc biệt: M5 chỉ cho 1k3s nếu lineRules có rule cho M5 là 1k3s
    const m5RuleIsStrict = lineRules.some(r => {
        const line = lines.find(l => l.id === r.lineId);
        return line?.lineCode === 'M5' && r.ruleType === 'PRODUCT_TYPE' && r.ruleValue.toUpperCase() === '1K3S';
    });

    if (matchedRules.length > 0) {
        candidates = lines.filter(l => matchedRules.some(r => r.lineId === l.id));
    } else {
        // Hàng không có rule cụ thể: Ưu tiên M1-M4
        candidates = lines.filter(l => !['H1', 'H2', 'M5'].includes(l.lineCode));
        
        // Nếu các chuyền chính quá tải, mới tràn sang M5 CHỈ KHI M5 KHÔNG CĂNG RULE 1K3S
        if (candidates.length === 0 || candidates.every(c => lineLoads[c.id] > 12)) {
             if (!m5RuleIsStrict || productType === '1K3S') {
                 candidates.push(...lines.filter(l => l.lineCode === 'M5'));
             }
        }
    }

    // Ưu tiên Thăng hoa vào H1 nếu không có rule cụ thể
    if (thangHoa === 'CÓ' && candidates.every(c => c.lineCode !== 'H1')) {
        const h1 = lines.find(l => l.lineCode === 'H1');
        if (h1) candidates.unshift(h1);
    }

    // H2 Logic remains strict (KEEP)
    if (mold === 'OE-0656' || mold === 'OE-1429') {
       candidates = lines.filter(l => l.lineCode === 'H2');
    } else {
       candidates = candidates.filter(l => l.lineCode !== 'H2');
    }

    let selectedLine = candidates.sort((a, b) => lineLoads[a.id] - lineLoads[b.id])[0];
    
    if (!selectedLine) {
       selectedLine = lines.filter(l => !['H1', 'H2'].includes(l.lineCode))
                           .sort((a, b) => lineLoads[a.id] - lineLoads[b.id])[0];
    }
    
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
