"use client";

import React, { useState, useEffect, useMemo } from "react";
import { groupBOMs } from "@/lib/productionLogic";
import { Filter, Search, Grid, List, CheckCircle, Clock, AlertTriangle, AlertCircle, Package, FileDown, RefreshCcw, Layers } from "lucide-react";

type Job = {
  type: 'CONFIRMED';
  jobId: number;
  orderId: string | null;
  lineId: string | null;
  status: string | null;
  estimatedEndTime: string | null;
  qty: number | null;
  bom: string | null;
  moldType: string | null;
  cuttingDie: string | null;
  rawStatus: string | null;
  brand: string | null;
  createdAt: string | null;
  isPriority?: boolean;
  logoStatus?: string;
  descriptionPU1?: string;
  descriptionFB?: string;
  productType?: string;
};

type PredictedGroup = {
  type: 'PREDICTED';
  id: string;
  bom: string;
  totalQuantity: number;
  items: any[];
  moldType: string;
  cuttingDie: string;
  rawStatus: string;
  logoStatus?: string;
  descriptionPU1?: string;
  descriptionFB?: string;
  productType?: string;
  avgFinishDate: number;
  minFinishDate: number;
  isPriority?: boolean;
};

type LineSchedule = {
  id: string;
  lineCode: string;
  machineCount: number;
  confirmed: Job[];
  predicted: PredictedGroup[];
};

import { autoSuggest } from "@/lib/autoRouter";

interface ScheduleClientProps {
    data: LineSchedule[]; 
    rawData: any[]; 
    manualCombines: any[]; 
    knownMolds?: string[];
    allLines?: any[];
    lineRules?: any[];
    moldTargets?: any[];
}

export default function ScheduleClient({ 
    data, 
    rawData, 
    manualCombines, 
    knownMolds = [],
    allLines = [],
    lineRules = [],
    moldTargets = []
}: ScheduleClientProps) {
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'CONFIG'>('SCHEDULE'); 
  const [activeLineId, setActiveLineId] = useState(data[0]?.id);
  const [mounted, setMounted] = useState(false);
  const [combineMode, setCombineMode] = useState<'AUTO' | 'MANUAL'>('AUTO');

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('combineMode');
    if (saved === 'MANUAL' || saved === 'AUTO') {
        setCombineMode(saved);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
        localStorage.setItem('combineMode', combineMode);
    }
  }, [combineMode, mounted]);

  // --- DYNAMIC CLIENT-SIDE ROUTING ---
  const clientData = useMemo(() => {
    // During SSR or before mounting, use server-provided 'data' to ensure match
    if (!mounted) return data; 

    const groups = groupBOMs(rawData, manualCombines, combineMode);
    const suggestions = autoSuggest(groups, allLines, moldTargets, lineRules);

    return allLines.map(line => {
        const linePredictedGroups = groups
            .filter(g => suggestions[g.id]?.lineId === line.id)
            .map(g => ({
                ...g,
                type: 'PREDICTED' as const,
                suggestion: suggestions[g.id]?.suggestion || ""
            }));

        const serverLine = data.find(l => l.id === line.id);
        return {
            ...line,
            confirmed: serverLine?.confirmed || [],
            predicted: linePredictedGroups
        };
    });
  }, [rawData, manualCombines, combineMode, allLines, moldTargets, lineRules, data, mounted]);

  const [filters, setFilters] = useState({
    urgent: false,
    delayed: false,
    noLogo: false,
    oldStock: false
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);

  const activeLineRaw = clientData.find((l) => l.id === activeLineId);
  
  // Re-group or Filter
  const processData = () => {
    if (!activeLineRaw) return [];

    let currentConfirmed = activeLineRaw.confirmed;
    let currentPredicted = activeLineRaw.predicted;

    let all = [
        ...currentConfirmed.map((j: any) => ({ ...j, type: 'CONFIRMED' as const })),
        ...currentPredicted.map((p: any) => ({ ...p, type: 'PREDICTED' as const }))
    ];

    // Apply Filters
    if (filters.urgent) all = all.filter(i => i.isPriority);
    if (filters.noLogo) all = all.filter(i => i.logoStatus === 'Chưa có Logo');
    if (filters.delayed) {
        const today = new Date().toISOString().split('T')[0];
        all = all.filter(i => {
            const fd = i.type === 'CONFIRMED' ? i.estimatedEndTime : (new Date(i.minFinishDate).toISOString().split('T')[0]);
            return fd && fd < today;
        });
    }
    // Search
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        all = all.filter((i: any) => 
            (i.bom?.toLowerCase().includes(lowerSearch)) ||
            (i.type === 'CONFIRMED' ? i.orderId?.toLowerCase().includes(lowerSearch) : i.items.some((it: any) => it.id.toLowerCase().includes(lowerSearch))) ||
            (i.moldType?.toLowerCase().includes(lowerSearch)) ||
            ((i.type === 'CONFIRMED' ? i.brand : i.items[0]?.brand)?.toLowerCase().includes(lowerSearch))
        );
    }

    // Default Sort + Manual Sort
    all.sort((a, b) => {
        // Priority 1: GẤP (isPriority)
        const aPriority = a.isPriority ? 1 : 0;
        const bPriority = b.isPriority ? 1 : 0;
        if (aPriority !== bPriority) return bPriority - aPriority;

        // Priority 2: 5.1 + Có Logo
        const aIs51WithLogo = (a.rawStatus?.includes('5.1') && a.logoStatus === 'Có Logo') ? 1 : 0;
        const bIs51WithLogo = (b.rawStatus?.includes('5.1') && b.logoStatus === 'Có Logo') ? 1 : 0;
        if (aIs51WithLogo !== bIs51WithLogo) return bIs51WithLogo - aIs51WithLogo;
        
        // If both are P2, sort by finish date
        if (aIs51WithLogo && bIs51WithLogo) {
            const dateA = a.type === 'CONFIRMED' ? a.estimatedEndTime : a.minFinishDate;
            const dateB = b.type === 'CONFIRMED' ? b.estimatedEndTime : b.minFinishDate;
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
        }

        // Priority 3: Status 5. OR Chưa có Logo
        const aP3 = (a.rawStatus?.startsWith('5.') || a.logoStatus === 'Chưa có Logo') ? 1 : 0;
        const bP3 = (b.rawStatus?.startsWith('5.') || b.logoStatus === 'Chưa có Logo') ? 1 : 0;
        if (aP3 !== bP3) return bP3 - aP3;

        // Manual Sort (if config exists)
        if (sortConfig) {
            let valA: any, valB: any;
            if (sortConfig.key === 'bom') { valA = a.bom; valB = b.bom; }
            if (sortConfig.key === 'order') { valA = a.type === 'CONFIRMED' ? a.orderId : a.items[0]?.id; valB = b.type === 'CONFIRMED' ? b.orderId : b.items[0]?.id; }
            if (sortConfig.key === 'brand') { valA = a.type === 'CONFIRMED' ? a.brand : a.items[0]?.brand; valB = b.type === 'CONFIRMED' ? b.brand : b.items[0]?.brand; }
            if (sortConfig.key === 'qty') { valA = a.type === 'CONFIRMED' ? a.qty : a.totalQuantity; valB = b.type === 'CONFIRMED' ? b.qty : b.totalQuantity; }
            if (sortConfig.key === 'finish') { valA = a.type === 'CONFIRMED' ? a.estimatedEndTime : a.minFinishDate; valB = b.type === 'CONFIRMED' ? b.estimatedEndTime : b.minFinishDate; }
            
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        }

        // Default: sort by finish date
        const dateA = a.type === 'CONFIRMED' ? a.estimatedEndTime : a.minFinishDate;
        const dateB = b.type === 'CONFIRMED' ? b.estimatedEndTime : b.minFinishDate;
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;

        return 0;
    });

    return all;
  };

  const filteredItems = processData();
  const totalPairs = filteredItems.reduce((sum, i) => sum + (i.type === 'CONFIRMED' ? (i.qty || 0) : i.totalQuantity), 0);
  const displayed = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const unknownMolds = React.useMemo(() => {
     const mappedKnownMolds = knownMolds.map(m => m.toUpperCase());
     
     const found = new Set<string>();
     rawData.forEach(o => {
         const mold = (o.moldType || "").toUpperCase().trim();
         if (mold && !mappedKnownMolds.includes(mold)) {
             found.add(mold);
         }
     });
     return Array.from(found);
  }, [rawData, knownMolds]);

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      const resp = await fetch("/api/sync", { method: "POST" });
      if (resp.ok) {
        window.location.reload();
      }
    } catch (e) {
      alert("Lỗi khi làm mới dữ liệu.");
    } finally {
      setSyncing(false);
    }
  };

  const handleExportExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const allExportData: any[] = [];
    const today = new Date().toISOString().split('T')[0];

    clientData.forEach((line: any) => {
        // Confirmed jobs - each is an individual order
        line.confirmed.forEach((j: any) => {
            const isPriority = j.isPriority;
            const isDelayed = j.estimatedEndTime && j.estimatedEndTime < today;
            let note = "Bình thường";
            if (isPriority) note = "GẤP";
            else if (isDelayed) note = "Trễ";
            else if (j.logoStatus === "Chưa có Logo") note = "Chưa có Logo";

            allExportData.push({
                "Line sắp vào": line.lineCode,
                "Pro order": j.orderId,
                "brand": j.brand || "",
                "article": j.articleCode || "",
                "Qty": j.qty,
                "BOM": j.bom,
                "Moldtype": j.moldType,
                "ProductType": j.productType || "",
                "#Last": j.cuttingDie || "",
                "PU description": j.descriptionPU1 || "",
                "FB description": j.descriptionFB || "",
                "code Logo1": j.codeLogo1 || "",
                "Finish date": j.estimatedEndTime || "",
                "Status": j.rawStatus || j.status || "",
                "Note": note
            });
        });

        // Predicted groups - expand each group into individual orders
        line.predicted.forEach((g: any) => {
            if (!g.items) return;
            g.items.forEach((item: any) => {
                const isPriority = item.isPriority;
                const finishDate = item.finishDate || "";
                const isDelayed = finishDate && finishDate < today;
                let note = "Bình thường";
                if (isPriority) note = "GẤP";
                else if (isDelayed) note = "Trễ";
                else if (item.logoStatus === "Chưa có Logo") note = "Chưa có Logo";

                allExportData.push({
                    "Line sắp vào": line.lineCode,
                    "Pro order": item.id,
                    "brand": item.brand || "",
                    "article": item.articleCode || "",
                    "Qty": item.quantity,
                    "BOM": item.bom || g.bom,
                    "Moldtype": item.moldType || g.moldType,
                    "ProductType": item.productType || "",
                    "#Last": item.cuttingDie || "",
                    "PU description": item.descriptionPU1 || "",
                    "FB description": item.descriptionFB || "",
                    "code Logo1": item.codeLogo1 || "",
                    "Finish date": item.finishDate || "",
                    "Status": item.rawStatus || "",
                    "Note": note
                });
            });
        });
    });

    const ws = utils.json_to_sheet(allExportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Schedule");
    writeFile(wb, `Schedule_All_Lines_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getRowStyle = (item: any) => {
    const today = new Date().toISOString().split('T')[0];
    const finishDate = item.type === 'CONFIRMED' ? item.estimatedEndTime : (new Date(item.minFinishDate).toISOString().split('T')[0]);
    
    if (item.isPriority) return "bg-rose-100 hover:bg-rose-200 border-rose-500 shadow-[inset_4px_0_0_0_#e11d48]";
    if (finishDate && finishDate < today) return "bg-purple-100 hover:bg-purple-200 border-purple-500 shadow-[inset_4px_0_0_0_#9333ea]";
    if (item.logoStatus === "Chưa có Logo") return "bg-amber-100 hover:bg-amber-200 border-amber-500 shadow-[inset_4px_0_0_0_#d97706]";
    return "bg-white hover:bg-slate-50 border-slate-200";
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20 font-inter">
      {/* Top Header / Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50">
        <div className="flex items-center gap-6">
           <div className="p-4 bg-indigo-600 text-white rounded-[2rem] shadow-lg shadow-indigo-100">
              <Layers className="w-8 h-8" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-outfit">Sẵn sàng phân bổ</p>
              <h2 className="text-2xl font-black text-slate-900 uppercase font-outfit">
                {rawData.length} đơn hàng <span className="text-indigo-600 text-lg ml-2">WIP MOLDING</span>
              </h2>
           </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
                onClick={() => setCombineMode('AUTO')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${combineMode === 'AUTO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
                Auto Group (Mode 1)
            </button>
            <button 
                onClick={() => setCombineMode('MANUAL')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${combineMode === 'MANUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
                Manual (Mode 2)
            </button>
          </div>
          <button 
                onClick={() => setActiveTab(activeTab === 'SCHEDULE' ? 'CONFIG' : 'SCHEDULE')}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all font-outfit"
          >
              {activeTab === 'SCHEDULE' ? 'Cấu hình gộp' : 'Quay lại'}
          </button>
          <button 
            onClick={() => {
                // Toggling combineMode slightly or just triggering a re-render can force useMemo
                setSyncing(true);
                setTimeout(() => {
                    setSyncing(false);
                    // This forces useMemo to re-evaluate by effectively "touching" the state
                    setCurrentPage(1); 
                }, 500);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
          >
            <RefreshCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Phân bổ lại
          </button>
          <button 
            onClick={handleRefresh}
            disabled={syncing}
            className="p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:border-indigo-600 transition-all"
          >
            <RefreshCcw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 italic"
          >
            <FileDown className="w-5 h-5" /> Excel Report
          </button>
        </div>
      </div>

      {unknownMolds.length > 0 && activeTab === 'SCHEDULE' && (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm">
             <div className="flex items-center gap-4">
                 <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                     <AlertTriangle className="w-6 h-6" />
                 </div>
                 <div>
                     <h4 className="text-amber-800 font-black uppercase tracking-tighter text-lg">Phát hiện Mã Khuôn chuyên biệt</h4>
                     <p className="text-amber-700/80 text-sm font-bold mt-1">Các mã khuôn cần cấu hình Line Rules mới: <span className="font-black text-amber-900 border-b border-amber-900/30">{unknownMolds.join(", ")}</span> (Khác 1k1s, 1k3s, SP, Die-cut, Laminating)</p>
                 </div>
             </div>
             <button onClick={() => setActiveTab('CONFIG')} className="mt-4 md:mt-0 px-6 py-3 bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 whitespace-nowrap">Cài đặt Line Rules</button>
          </div>
      )}

      {activeTab === 'SCHEDULE' && (
        <>
            {/* Filter & Search Bar */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-50 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm BOM, mã đơn..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-3 bg-slate-50 border-transparent border focus:border-indigo-500 rounded-2xl text-sm font-bold transition-all"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'urgent', label: 'Hàng Gấp', icon: <AlertCircle className="w-3 h-3"/>, color: 'text-rose-600 bg-rose-50 border-rose-100' },
                            { id: 'delayed', label: 'Đơn Trễ', icon: <Clock className="w-3 h-3"/>, color: 'text-purple-600 bg-purple-50 border-purple-100' },
                            { id: 'noLogo', label: 'Chưa Logo', icon: <Package className="w-3 h-3"/>, color: 'text-amber-600 bg-amber-50 border-amber-100' }
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilters(prev => ({ ...prev, [f.id]: !prev[f.id as keyof typeof prev] }))}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${filters[f.id as keyof typeof filters] ? f.color : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                            >
                                {f.icon} {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Line Selection Tabs */}
            <div className="flex overflow-x-auto gap-2 p-2 bg-slate-100/50 rounded-3xl no-scrollbar">
                {data.map((line) => (
                    <button
                        key={line.id}
                        onClick={() => { setActiveLineId(line.id); setCurrentPage(1); }}
                        className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${
                        activeLineId === line.id
                            ? "bg-slate-900 text-white shadow-xl scale-[1.05] z-10"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        Chuyền {line.lineCode}
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] ${activeLineId === line.id ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                            {line.confirmed.length + line.predicted.length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Main Schedule Display */}
            <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100">
                <div className="bg-slate-900 px-12 py-10 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase font-outfit italic">Chuyền {activeLineRaw?.lineCode}</h2>
                        <div className="flex items-center gap-4 mt-3">
                             <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/10">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{activeLineRaw?.machineCount} Máy</span>
                             </div>
                             <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Kế hoạch sản xuất dự kiến</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dự thảo hiện tại</div>
                        <div className="text-3xl font-black font-outfit">
                            {filteredItems.length} <span className="text-sm text-slate-500">nhóm lệnh</span>
                        </div>
                        <div className="text-indigo-400 font-bold text-lg mt-1">
                            {totalPairs.toLocaleString()} <span className="text-xs uppercase font-black opacity-60 text-slate-500">đôi (PRS)</span>
                        </div>
                    </div>
                </div>

                <div className="p-8 overflow-x-auto min-h-[400px]">
                    <table className="w-full border-separate border-spacing-y-4">
                    <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left select-none">
                        <th className="px-6 py-4">STT</th>
                        <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setSortConfig({key: 'bom', direction: sortConfig?.key === 'bom' && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>
                            BOM & Chi tiết {sortConfig?.key === 'bom' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setSortConfig({key: 'order', direction: sortConfig?.key === 'order' && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>
                            Mã đơn (PRO) {sortConfig?.key === 'order' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setSortConfig({key: 'brand', direction: sortConfig?.key === 'brand' && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>
                            Khách hàng {sortConfig?.key === 'brand' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setSortConfig({key: 'qty', direction: sortConfig?.key === 'qty' && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>
                            Số lượng {sortConfig?.key === 'qty' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
                        <th className="px-6 py-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setSortConfig({key: 'finish', direction: sortConfig?.key === 'finish' && sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>
                            Hạn HT {sortConfig?.key === 'finish' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
                        <th className="px-6 py-4 text-right">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayed.map((item, idx) => {
                            const seq = (currentPage - 1) * itemsPerPage + idx + 1;
                            const today = new Date().toISOString().split('T')[0];
                            const finishDate = item.type === 'CONFIRMED' ? item.estimatedEndTime : (new Date(item.minFinishDate).toISOString().split('T')[0]);
                            const isDelayed = finishDate && finishDate < today;
                            const rowClass = getRowStyle(item);
                            
                            return (
                                <tr key={idx} className={`transition-all group border ${rowClass} rounded-3xl shadow-sm`}>
                                <td className="px-6 py-8 rounded-l-[2.5rem]">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xl font-black text-slate-200 group-hover:text-indigo-200 font-outfit">{seq < 10 ? `0${seq}` : seq}</span>
                                        <div className="flex flex-col gap-1">
                                            {item.isPriority && <span className="px-2 py-0.5 bg-rose-600 text-white text-[8px] font-black rounded-lg w-fit">GẤP</span>}
                                            {isDelayed && <span className="px-2 py-0.5 bg-purple-600 text-white text-[8px] font-black rounded-lg w-fit">TRỄ</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-8">
                                    <div className="font-black text-xl text-slate-900 font-outfit tracking-tighter italic flex flex-wrap items-center gap-2">
                                        #{item.bom}
                                        {item.type === 'PREDICTED' && item.isManual && (
                                            <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full not-italic">MANUAL</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">M: {item.moldType}</span>
                                        <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">D: {item.cuttingDie || '---'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-8">
                                    <div className="text-[10px] font-bold text-slate-500 max-w-[250px] whitespace-pre-line leading-relaxed">
                                        {item.type === 'CONFIRMED' ? (
                                            item.orderId?.split(',').map((id: string, idx: number) => {
                                                const manual = manualCombines.find(m => String(m.orderId).trim() === id.trim());
                                                return (
                                                    <div key={idx} className="flex flex-col mb-1">
                                                        <span>{id}</span>
                                                        {manual && <span className="text-[8px] text-emerald-600 font-black uppercase bg-emerald-50 px-1 rounded w-fit">Manual: {manual.combineName}</span>}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            item.items.map((i: any, idx: number) => {
                                                const manual = manualCombines.find(m => String(m.orderId).trim() === String(i.id).trim());
                                                return (
                                                    <div key={idx} className="flex flex-col mb-1">
                                                        <span>{i.id}</span>
                                                        {manual && <span className="text-[8px] text-emerald-600 font-black uppercase bg-emerald-50 px-1 rounded w-fit">Manual: {manual.combineName}</span>}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-8">
                                    <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase italic">
                                        {item.type === 'CONFIRMED' ? item.brand : item.items[0]?.brand}
                                    </div>
                                </td>
                                <td className="px-6 py-8">
                                    <div className="text-3xl font-black text-slate-800 font-outfit italic">
                                        {(item.type === 'CONFIRMED' ? item.qty : item.totalQuantity)?.toLocaleString()}
                                    </div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Sản lượng (PRS)</p>
                                </td>
                                <td className="px-6 py-8">
                                    <div className={`text-sm font-black ${isDelayed ? 'text-rose-500' : 'text-slate-600'}`}>
                                        {finishDate ? new Date(finishDate).toLocaleDateString('vi-VN') : '---'}
                                    </div>
                                    <div className="text-[8px] font-bold text-slate-400 uppercase mt-1">Mục tiêu</div>
                                </td>
                                <td className="px-6 py-8 rounded-r-[2.5rem] text-right">
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="px-4 py-1 bg-slate-900 text-white text-[9px] font-black rounded-xl italic">
                                            {item.productType || "SP"}
                                        </span>
                                        {item.type === 'PREDICTED' && item.suggestion && (
                                            <div className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">
                                                {item.suggestion}
                                            </div>
                                        )}
                                        <div className={`px-3 py-1 rounded-xl text-[9px] font-black ${item.logoStatus === 'Có Logo' ? 'bg-emerald-100 text-emerald-600' : item.logoStatus === 'Chưa có Logo' ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                                            {item.logoStatus || "Chờ Logo"}
                                        </div>
                                        <div className="text-[8px] font-bold text-slate-400 mt-1 uppercase max-w-[120px] text-right truncate" title={item.rawStatus}>
                                            {item.rawStatus || "---"}
                                        </div>
                                    </div>
                                </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-6 py-12 bg-slate-50/50">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-4 bg-white border border-slate-200 rounded-2xl disabled:opacity-30 hover:shadow-lg transition-all"
                        >
                            <svg className="w-5 h-5 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                        </button>
                        <span className="text-sm font-black uppercase tracking-widest text-slate-400">Trang {currentPage} / {totalPages}</span>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="p-4 bg-white border border-slate-200 rounded-2xl disabled:opacity-30 hover:shadow-lg transition-all"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                        </button>
                    </div>
                )}
            </div>
        </>
      )}

      {activeTab === 'CONFIG' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                        <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">Upload Manual Combine</h3>
                </div>
                <p className="text-xs text-slate-500 mb-8 leading-relaxed font-bold">
                    Tải lên danh sách các đơn hàng cần gộp chung với nhau. <br/>
                    Cấu trúc file: Cột A (Mã đơn LSX), Cột B (Tên nhóm gộp).
                </p>
                <div className="space-y-4">
                    <input 
                        type="file" 
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setLoading(true);
                            try {
                                const { read, utils } = await import("xlsx");
                                const ab = await file.arrayBuffer();
                                const wb = read(ab);
                                const rows: any[] = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
                                const dataRows = rows.slice(1).filter(r => r[0] && r[1]);
                                const resp = await fetch("/api/manual-combine", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ combines: dataRows.map(r => ({ orderId: String(r[0]).trim(), combineName: String(r[1]).trim() })) })
                                });
                                if (resp.ok) window.location.reload();
                            } catch (e) { alert("Lỗi tải file"); } finally { setLoading(false); }
                        }} 
                        className="w-full text-xs file:mr-6 file:py-4 file:px-8 file:rounded-2xl file:border-0 file:bg-slate-900 file:text-white file:font-black hover:file:bg-black cursor-pointer" 
                    />
                    {loading && <div className="text-[10px] font-black text-indigo-600 animate-pulse">ĐANG XỬ LÝ DỮ LIỆU...</div>}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
