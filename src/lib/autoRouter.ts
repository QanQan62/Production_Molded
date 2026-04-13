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

    // 1. Nhóm rule theo từng chuyền
    const rulesByLine: Record<string, any[]> = {};
    lineRules.forEach(r => {
        if (!rulesByLine[r.lineId]) rulesByLine[r.lineId] = [];
        rulesByLine[r.lineId].push(r);
    });

    let candidates: Line[] = [];

    // 2. Đánh giá xem order này có khớp hoàn toàn với cấu hình của chuyền nào không
    Object.keys(rulesByLine).forEach(lineId => {
        const rulesForThisLine = rulesByLine[lineId];
        
        // Nhóm các rule của chuyền này theo loại (RuleType)
        const rulesByType: Record<string, any[]> = {};
        rulesForThisLine.forEach(r => {
            if (!rulesByType[r.ruleType]) rulesByType[r.ruleType] = [];
            rulesByType[r.ruleType].push(r);
        });

        // Chuyền hợp lệ nếu order khớp với TẤT CẢ các loại rule (AND logic).
        // Trong cùng 1 loại rule, chỉ cần khớp 1 giá trị là được (OR logic).
        let isStrictMatchForLine = true;

        for (const ruleType in rulesByType) {
            const rules = rulesByType[ruleType];
            const isMatchForThisType = rules.some(r => {
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
                        return totalQty >= Number(parts[0]) && totalQty <= Number(parts[1]);
                    }
                }
                return false;
            });
            
            if (!isMatchForThisType) {
                isStrictMatchForLine = false;
                break;
            }
        }

        if (isStrictMatchForLine) {
            const lineObj = lines.find(l => l.id === lineId);
            if (lineObj) candidates.push(lineObj);
        }
    });

    // Đặc biệt: M5 chỉ cho 1k3s nếu lineRules có rule cho M5 là 1k3s
    const m5RuleIsStrict = lineRules.some(r => {
        const line = lines.find(l => l.id === r.lineId);
        return line?.lineCode === 'M5' && r.ruleType === 'PRODUCT_TYPE' && r.ruleValue.toUpperCase() === '1K3S';
    });

    // 3. Chọn chuyền có Load ít nhất trong danh sách candidates
    let selectedLine = candidates.sort((a, b) => lineLoads[a.id] - lineLoads[b.id])[0];
    
    // ĐẶC BIỆT: CƠ CHẾ TRÀN (SPILLOVER CACHING)
    // Nếu chuyền chỉ định đã đầy (quá 12 tiếng) HOẶC không có chuyền nào khớp rule
    // Hệ thống sẽ chủ động tìm các chuyền khác (H1, M5, v.v.) đang rảnh rỗi để gánh bớt tải.
    const MAX_LOAD_LIMIT = 12; // Giới hạn ~50k đôi / ngày tương ứng ~12 tiếng chạy
    
    if (!selectedLine || lineLoads[selectedLine.id] >= MAX_LOAD_LIMIT) {
        // Tìm các chuyền còn dư dưới năng lực MAX_LOAD_LIMIT
        let spilloverCandidates = lines.filter(l => {
            if (selectedLine && l.id === selectedLine.id) return false; // Không lấy lại chuyền đang đầy
            
            // Xử lý ràng buộc vật lý cứng:
            // 1. Máy Thăng Hoa: Hàng Thăng Hoa "CÓ" bắt buộc phải vào line có hỗ trợ Thăng Hoa
            if (thangHoa === 'CÓ') {
                const lineRulesForThangHoa = rulesByLine[l.id]?.filter(r => r.ruleType === 'THANG_HOA') || [];
                const canDoThangHoa = lineRulesForThangHoa.some(r => r.ruleValue.toUpperCase() === 'CÓ');
                // Nếu line chưa cấu hình rule Thăng Hoa, hoặc cấu hình Không -> Bỏ qua
                if (!canDoThangHoa && l.lineCode !== 'H1') return false; 
            }
            
            // 2. Chuyền M5 nếu đang khóa gắt 1K3S thì chỉ nhận 1k3s
            if (l.lineCode === 'M5' && m5RuleIsStrict && productType !== '1K3S') return false;

            return true;
        });

        // Chỉ ưu tiên những chuyền thật sự rảnh (Load < Load Limit)
        const freeSpillCands = spilloverCandidates.filter(l => lineLoads[l.id] < MAX_LOAD_LIMIT);
        
        if (freeSpillCands.length > 0) {
            // Lấy chuyền rảnh nhất
            const bestSpill = freeSpillCands.sort((a, b) => lineLoads[a.id] - lineLoads[b.id])[0];
            // Cập nhật selectedLine thành chuyền tràn
            selectedLine = bestSpill;
        } else if (!selectedLine) {
            // Nếu không có chuyền tràn nào rảnh < 12h vả cũng ko có selectedLine -> Lấy bừa chuyền ít tải nhất
            selectedLine = lines.sort((a, b) => lineLoads[a.id] - lineLoads[b.id])[0];
        }
    }
    
    // Đảm bảo không undefined
    if (!selectedLine) selectedLine = lines[0];

    if (selectedLine && target > 0) {
      // Điều chỉnh cứng cấu hình máy cho H1 và H2 (4 máy chặt), các chuyền còn lại (8 máy) nếu chưa có trong DB
      const defaultMachines = ['H1', 'H2'].includes(selectedLine.lineCode) ? 4 : 8;
      const machineCount = selectedLine.machineCount || defaultMachines;
      
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
