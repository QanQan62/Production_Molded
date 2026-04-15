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
  const lineLoads: Record<string, number> = {};
  lines.forEach(l => { lineLoads[l.id] = 0; });

  const rulesByLine: Record<string, any[]> = {};
  lineRules.forEach(r => {
      if (!rulesByLine[r.lineId]) rulesByLine[r.lineId] = [];
      rulesByLine[r.lineId].push(r);
  });

  const m5RuleIsStrict = lineRules.some(r => {
      const line = lines.find(l => l.id === r.lineId);
      return line?.lineCode === 'M5' && r.ruleType === 'PRODUCT_TYPE' && r.ruleValue.toUpperCase() === '1K3S';
  });

  const initialAssignments: Record<string, any[]> = {};
  lines.forEach(l => { initialAssignments[l.id] = []; });
  const unmatchedPool: BomGroup[] = [];

  // --- PASS 1: Khớp Rule Chính Xác ---
  bomGroups.forEach(group => {
    const firstItem = group.items[0];
    const brand = (firstItem.brand || "").toUpperCase();
    const mold = (group.moldType || "").toUpperCase();
    const article = (firstItem.articleCode || "").toUpperCase();
    const productType = (firstItem.productType || "").toUpperCase();
    const thangHoa = (firstItem.thangHoa || "").trim() !== "" ? "CÓ" : "KHÔNG";
    const totalQty = group.totalQuantity;

    let matchedLines: Line[] = [];

    Object.keys(rulesByLine).forEach(lineId => {
        const rulesForThisLine = rulesByLine[lineId];
        const rulesByType: Record<string, any[]> = {};
        rulesForThisLine.forEach(r => {
            if (!rulesByType[r.ruleType]) rulesByType[r.ruleType] = [];
            rulesByType[r.ruleType].push(r);
        });

        let isStrictMatch = true;
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
                    if (parts.length === 2) return totalQty >= Number(parts[0]) && totalQty <= Number(parts[1]);
                }
                return false;
            });
            if (!isMatchForThisType) { isStrictMatch = false; break; }
        }
        if (isStrictMatch) {
            const l = lines.find(ln => ln.id === lineId);
            if (l) matchedLines.push(l);
        }
    });

    if (matchedLines.length > 0) {
        // Tạm thời chọn chuyền đầu tiên khớp rule
        initialAssignments[matchedLines[0].id].push(group);
    } else {
        unmatchedPool.push(group);
    }
  });

  // --- PASS 2: Xử lý Tràn (Chỉ đẩy đơn có ngày finish xa đi) ---
  const MAX_LOAD_LIMIT = 21; 
  const spilloverPool: BomGroup[] = [...unmatchedPool];

  Object.keys(initialAssignments).forEach(lineId => {
      const line = lines.find(l => l.id === lineId)!;
      let currentGroups = initialAssignments[lineId];
      
      const calculateLoad = (grps: BomGroup[]) => {
          let totalH = 0;
          grps.forEach(g => {
              const target = moldTargets.find(t => t.moldType === g.moldType)?.targetPerHour || 0;
              if (target > 0) {
                  const machineCount = line.machineCount || (['H1', 'H2'].includes(line.lineCode) ? 4 : 8);
                  totalH += g.totalQuantity / (target * machineCount);
              }
          });
          return totalH;
      };

      // Nếu quá tải, bốc những đơn xa nhất chuyển vào spilloverPool
      if (calculateLoad(currentGroups) > MAX_LOAD_LIMIT) {
          // Sắp xếp theo ngày finish xa nhất lên đầu để bốc đi trước
          currentGroups.sort((a, b) => b.avgFinishDate - a.avgFinishDate);
          
          while (calculateLoad(currentGroups) > MAX_LOAD_LIMIT && currentGroups.length > 1) {
              const removed = currentGroups.shift(); // Lấy đơn xa nhất
              if (removed) spilloverPool.push(removed);
          }
      }

      // Lưu lại kết quả khớp cấu hình
      currentGroups.forEach(g => {
          const target = moldTargets.find(t => t.moldType === g.moldType)?.targetPerHour || 0;
          const machineCount = line.machineCount || (['H1', 'H2'].includes(line.lineCode) ? 4 : 8);
          const prodTime = calculateProductionTime(g.totalQuantity, target, machineCount);
          
          assignments[g.id] = {
              lineId: line.id,
              targetPerHour: target,
              suggestion: `[Khớp cấu hình] ${prodTime.suggestion}`,
              isUrgent: g.items.some((i: any) => i.isPriority)
          };
          lineLoads[line.id] += prodTime.totalHours;
      });
  });

  // --- PASS 3: Phân bổ Pool Tràn vào các chuyền rảnh ---
  // Sắp xếp spilloverPool để ưu tiên đơn gấp/gần trước
  spilloverPool.sort((a, b) => {
    const aUrgent = a.items.some((i: any) => i.isPriority);
    const bUrgent = b.items.some((i: any) => i.isPriority);
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    return a.avgFinishDate - b.avgFinishDate;
  });

  spilloverPool.forEach(group => {
      const firstItem = group.items[0];
      const productType = (firstItem.productType || "").toUpperCase();
      const thangHoa = (firstItem.thangHoa || "").trim() !== "" ? "CÓ" : "KHÔNG";
      const mold = (group.moldType || "").toUpperCase();

      let candidates = lines.filter(l => {
          // Ràng buộc vật lý cứng
          if (thangHoa === 'CÓ') {
            const lineRulesForThangHoa = rulesByLine[l.id]?.filter(r => r.ruleType === 'THANG_HOA') || [];
            if (!lineRulesForThangHoa.some(r => r.ruleValue.toUpperCase() === 'CÓ') && l.lineCode !== 'H1') return false; 
          }
          if (l.lineCode === 'M5' && m5RuleIsStrict && productType !== '1K3S') return false;
          
          // Tránh các line có cấu hình MOLD khác hoàn toàn
          const lineMoldRules = rulesByLine[l.id]?.filter(r => r.ruleType === 'MOLD') || [];
          if (lineMoldRules.length > 0 && !lineMoldRules.some(r => mold.includes(r.ruleValue.toUpperCase()))) return false;
          
          return true;
      });

      // Nếu lọc gắt quá mất candidate, nới lỏng (trừ Thăng Hoa/M5)
      if (candidates.length === 0) {
          candidates = lines.filter(l => {
              if (thangHoa === 'CÓ' && l.lineCode !== 'H1') {
                const lineRulesForThangHoa = rulesByLine[l.id]?.filter(r => r.ruleType === 'THANG_HOA') || [];
                if (!lineRulesForThangHoa.some(r => r.ruleValue.toUpperCase() === 'CÓ')) return false;
              }
              if (l.lineCode === 'M5' && m5RuleIsStrict && productType !== '1K3S') return false;
              return true;
          });
      }

      // Sắp xếp candidates theo: Độ tương đồng Rule (Mold/ProductType) > Tải trọng (Load)
      const bestLine = candidates.sort((a, b) => {
          const getMatchScore = (lineId: string) => {
              let score = 0;
              const rules = rulesByLine[lineId] || [];
              // Ưu tiên cực cao cho line có cấu hình Mold giống hệt
              if (rules.some(r => r.ruleType === 'MOLD' && mold.includes(r.ruleValue.toUpperCase()))) score -= 100;
              // Ưu tiên cao cho line có cấu hình Loại hàng giống hệt
              if (rules.some(r => r.ruleType === 'PRODUCT_TYPE' && productType === r.ruleValue.toUpperCase())) score -= 50;
              return score;
          };

          const scoreA = getMatchScore(a.id) + (lineLoads[a.id] * 5); // Nhân 5 để tải trọng (giờ) vẫn có trọng số
          const scoreB = getMatchScore(b.id) + (lineLoads[b.id] * 5);
          return scoreA - scoreB;
      })[0] || lines[0];

      const target = moldTargets.find(t => t.moldType === group.moldType)?.targetPerHour || 0;
      const machineCount = bestLine.machineCount || (['H1', 'H2'].includes(bestLine.lineCode) ? 4 : 8);
      const prodTime = calculateProductionTime(group.totalQuantity, target, machineCount);

      assignments[group.id] = {
          lineId: bestLine.id,
          targetPerHour: target,
          suggestion: `[Tự động cân đối] ${prodTime.suggestion}`,
          isUrgent: group.items.some((i: any) => i.isPriority)
      };
      lineLoads[bestLine.id] += prodTime.totalHours;
  });

  return assignments;
}
