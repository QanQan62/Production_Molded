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
  lineRules: any[] = [],
  overflowEnabled: boolean = true
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

        const checkMatch = (r: any) => {
            const val = (r.ruleValue || "").toUpperCase().trim();
            const isExclude = String(r.isExclude) === 'true' || String(r.isExclude) === '1';
            
            let match = false;
            if (r.ruleType === 'BRAND') match = brand.includes(val);
            else if (r.ruleType === 'MOLD') match = mold.includes(val);
            else if (r.ruleType === 'ARTICLE') match = article.includes(val);
            else if (r.ruleType === 'PRODUCT_TYPE') match = productType === val;
            else if (r.ruleType === 'THANG_HOA') match = thangHoa === val;
            else if (r.ruleType === 'TOTAL_QTY_GT') match = totalQty > Number(val);
            else if (r.ruleType === 'TOTAL_QTY_LT') match = totalQty < Number(val);
            else if (r.ruleType === 'TOTAL_QTY_RANGE') {
                const parts = val.split('-');
                if (parts.length === 2) match = totalQty >= Number(parts[0]) && totalQty <= Number(parts[1]);
            }
            
            return isExclude ? !match : match;
        };

        let passesHard = true;
        let passesSoft = false;
        let hasSoftRules = false;

        for (const ruleType in rulesByType) {
            if (ruleType === 'OVERFLOW_ALLOW' || ruleType === 'OVERFLOW_DENY') continue; // Bỏ qua rule tràn ở Pass 1
            
            const rules = rulesByType[ruleType];
            const hardRules = rules.filter(r => String(r.isStrict) !== 'false' && String(r.isStrict) !== '0');
            const softRules = rules.filter(r => String(r.isStrict) === 'false' || String(r.isStrict) === '0');

            if (hardRules.length > 0) {
                const inclusions = hardRules.filter(r => String(r.isExclude) !== 'true' && String(r.isExclude) !== '1');
                const exclusions = hardRules.filter(r => String(r.isExclude) === 'true' || String(r.isExclude) === '1');

                const passInc = inclusions.length === 0 || inclusions.some(checkMatch);
                const passExc = exclusions.length === 0 || exclusions.every(checkMatch);

                if (!passInc || !passExc) {
                    passesHard = false;
                    break;
                }
            }

            if (softRules.length > 0) {
                hasSoftRules = true;
                if (!passesSoft) {
                    const inclusions = softRules.filter(r => String(r.isExclude) !== 'true' && String(r.isExclude) !== '1');
                    const exclusions = softRules.filter(r => String(r.isExclude) === 'true' || String(r.isExclude) === '1');

                    const passInc = inclusions.length === 0 || inclusions.some(checkMatch);
                    const passExc = exclusions.length === 0 || exclusions.every(checkMatch);
                    
                    if (passInc && passExc) passesSoft = true;
                }
            }
        }
        
        const isStrictMatch = passesHard && (!hasSoftRules || passesSoft);
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
  const spilloverPool: BomGroup[] = [...unmatchedPool.map(g => ({ ...g, spilledFromLineCode: 'NONE' }))];

  Object.keys(initialAssignments).forEach(lineId => {
      const line = lines.find(l => l.id === lineId)!;
      let currentGroups = initialAssignments[lineId];
      
      const calculateLoad = (grps: BomGroup[]) => {
          let totalH = 0;
          grps.forEach(g => {
              const target = moldTargets.find(t => t.moldType === g.moldType)?.targetPerHour || 0;
              if (target > 0) {
                  const machineCount = line.machineCount || (['H1', 'H2'].includes(line.lineCode?.trim().toUpperCase()) ? 4 : 8);
                  totalH += g.totalQuantity / (target * machineCount);
              }
          });
          return totalH;
      };

      // Nếu quá tải VÀ có bật chế độ tràn, bốc những đơn xa nhất chuyển vào spilloverPool
      if (overflowEnabled && calculateLoad(currentGroups) > MAX_LOAD_LIMIT) {
          currentGroups.sort((a, b) => b.avgFinishDate - a.avgFinishDate);
          
          while (calculateLoad(currentGroups) > MAX_LOAD_LIMIT && currentGroups.length > 1) {
              const removed = currentGroups.shift();
              if (removed) {
                  (removed as any).spilledFromLineCode = line.lineCode; // Tag source
                  spilloverPool.push(removed);
              }
          }
      }

      // Lưu lại kết quả khớp cấu hình
      currentGroups.forEach(g => {
          const target = moldTargets.find(t => t.moldType === g.moldType)?.targetPerHour || 0;
          const machineCount = line.machineCount || (['H1', 'H2'].includes(line.lineCode?.trim().toUpperCase()) ? 4 : 8);
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
  // Khi overflowEnabled = false, bỏ qua bước này: chỉ đơn khớp rule mới được phân bổ
  if (!overflowEnabled) return assignments;
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
      const sourceLineCode = (group as any).spilledFromLineCode || 'NONE';

      let candidates = lines.filter(l => {
          // Overflow Rules Check
          const lineRulesForThisLine = rulesByLine[l.id] || [];
          
          // Rule: Không nhận đơn tràn từ Line
          const denyRules = lineRulesForThisLine.filter(r => r.ruleType === 'OVERFLOW_DENY');
          if (denyRules.some(r => r.ruleValue === 'Tất cả các Line' || r.ruleValue === sourceLineCode)) {
              return false;
          }

          // Rule: Nhận đơn tràn từ Line (Nếu có ít nhất 1 rule này, thì CHỈ nhận từ các line đó)
          const allowRules = lineRulesForThisLine.filter(r => r.ruleType === 'OVERFLOW_ALLOW');
          if (allowRules.length > 0) {
              const explicitlyAllowed = allowRules.some(r => r.ruleValue === 'Tất cả các Line' || r.ruleValue === sourceLineCode);
              if (!explicitlyAllowed) return false;
          }

          // Ràng buộc vật lý cứng
          if (thangHoa === 'CÓ') {
            const lineRulesForThangHoa = lineRulesForThisLine.filter(r => r.ruleType === 'THANG_HOA');
            if (!lineRulesForThangHoa.some(r => r.ruleValue.toUpperCase() === 'CÓ') && l.lineCode !== 'H1') return false; 
          }
          if (l.lineCode === 'M5' && m5RuleIsStrict && productType !== '1K3S') return false;
          
          const lineMoldRules = lineRulesForThisLine.filter(r => r.ruleType === 'MOLD');
          if (lineMoldRules.length > 0) {
            const inclusions = lineMoldRules.filter(r => String(r.isExclude) !== 'true' && String(r.isExclude) !== '1');
            const exclusions = lineMoldRules.filter(r => String(r.isExclude) === 'true' || String(r.isExclude) === '1');

            const passInc = inclusions.length === 0 || inclusions.some(r => mold.includes(r.ruleValue.toUpperCase()));
            const passExc = exclusions.length === 0 || exclusions.every(r => !mold.includes(r.ruleValue.toUpperCase()));

            if (!passInc || !passExc) return false;
          }
          
          return true;
      });

      // Nếu candidates trống, nới lỏng nhưng vẫn giữ Thăng Hoa/M5
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
              if (rules.some(r => r.ruleType === 'MOLD' && mold.includes(r.ruleValue.toUpperCase()))) score -= 100;
              if (rules.some(r => r.ruleType === 'PRODUCT_TYPE' && productType === r.ruleValue.toUpperCase())) score -= 50;
              return score;
          };

          const scoreA = getMatchScore(a.id) + (lineLoads[a.id] * 5);
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
