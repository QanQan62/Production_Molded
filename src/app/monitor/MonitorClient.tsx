"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Filter, Search, Clock, AlertCircle, Package, Layers, RefreshCcw, FileDown } from "lucide-react";

interface JobInfo {
  job: {
    id: number;
    status: string;
    createdAt: string | null;
    estimatedEndTime: string | null;
  };
  order: {
    id: string;
    articleCode: string | null;
    quantity: number | null;
    bom: string | null;
    moldType: string | null;
    sourceLine: string | null;
    originalBrand?: string | null;
    finishDate: string | null;
    leanlineInDate: string | null;
    cuttingDie: string | null;
    targetPerHour: number | null;
    isPriority: boolean | null;
    logoStatus?: string;
    descriptionPU1?: string;
    descriptionFB?: string;
    productType?: string;
    codeLogo1?: string;
    brand?: string;
  };
}

interface LineInfo {
  line: {
    id: string;
    lineCode: string;
  };
  activeJobs: JobInfo[];
}

export default function MonitorClient({ initialLines, rawData }: { initialLines: LineInfo[], rawData: any[] }) {
  const [activeLineId, setActiveLineId] = useState(initialLines[0]?.line.id);
  const [filters, setFilters] = useState({ urgent: false, delayed: false, noLogo: false, stagnant: false, hasLogo: false });
  const [syncing, setSyncing] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  const activeLineDataRaw = initialLines.find((l) => l.line.id === activeLineId);
  
  const calculateDuration = (startTime: string | null) => {
    if (!startTime) return { text: "---", days: 0 };
    const start = new Date(startTime);
    const diffMs = now.getTime() - start.getTime();
    if (diffMs <= 0) return { text: "Vừa mới vào", days: 0 };
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let result = "";
    if (diffDays > 0) result += `${diffDays}d `;
    result += `${diffHours}h ${diffMins}m`;
    return { text: result, days: diffDays };
  };

  const filteredJobs = useMemo(() => {
    if (!activeLineDataRaw) return [];
    let jobs = activeLineDataRaw.activeJobs;
    if (filters.urgent) jobs = jobs.filter(j => j.order.isPriority);
    if (filters.noLogo) jobs = jobs.filter(j => j.order.logoStatus === 'Chưa có Logo');
    if (filters.hasLogo) jobs = jobs.filter(j => j.order.logoStatus === 'Có Logo');
    if (filters.delayed) {
        const today = new Date().toISOString().split('T')[0];
        jobs = jobs.filter(j => j.order.finishDate && j.order.finishDate < today);
    }
    if (filters.stagnant) {
        jobs = jobs.filter(j => calculateDuration(j.order.leanlineInDate).days >= 2);
    }
    return jobs;
  }, [activeLineDataRaw, filters]);

  const totalPairs = filteredJobs.reduce((sum, j) => sum + (j.order.quantity || 0), 0);

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      window.location.reload();
    } catch (e) {
      alert("Lỗi làm mới.");
    } finally {
      setSyncing(false);
    }
  };

  const handleExportExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const allExportData: any[] = [];

    initialLines.forEach(lineInfo => {
        lineInfo.activeJobs.forEach(j => {
            const duration = calculateDuration(j.order.leanlineInDate);
            const isUrgent = j.order.isPriority || (j.order.finishDate === new Date().toISOString().split('T')[0]);
            const isDelayed = !!(j.order.finishDate && j.order.finishDate < new Date().toISOString().split('T')[0]);
            const isStagnant = duration.days >= 2;

            let note = "Bình thường";
            if (isUrgent) note = "Gấp";
            else if (isDelayed) note = "Trễ";
            else if (isStagnant) note = "Tồn lâu";

            allExportData.push({
                "Line": lineInfo.line.lineCode,
                "Pro order": j.order.id,
                "brand": j.order.brand || "",
                "article": j.order.articleCode || "",
                "qty": j.order.quantity,
                "BOM": j.order.bom,
                "Moldtype": j.order.moldType,
                "#Last": j.order.cuttingDie || "",
                "Pu description": j.order.descriptionPU1 || "",
                "FB description": j.order.descriptionFB || "",
                "code logo1": j.order.codeLogo1 || "",
                "finish date": j.order.finishDate || "",
                "Leanline In": j.order.leanlineInDate || "",
                "Note": note
            });
        });
    });
    
    const ws = utils.json_to_sheet(allExportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Monitor");
    writeFile(wb, `Monitor_All_Lines_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20 font-inter">
       {/* Actions Bar */}
       <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50">
        <div className="flex items-center gap-6">
           <div className="p-4 bg-slate-900 text-white rounded-[2rem]">
              <Layers className="w-8 h-8" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-outfit">Live Monitor</p>
              <h2 className="text-2xl font-black text-slate-900 uppercase font-outfit">Chuyền Sản Xuất</h2>
           </div>
        </div>
        <div className="flex flex-wrap gap-3">
            <button 
                onClick={handleRefresh}
                disabled={syncing}
                className="p-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl hover:border-indigo-600 transition-all transition-colors"
            >
                <RefreshCcw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg"
            >
                <FileDown className="w-5 h-5" /> Export Data
            </button>
        </div>
      </div>

      {/* Filter & Selection Sticky Bar */}
      <div className="sticky top-4 z-50 space-y-4">
          <div className="bg-white/80 backdrop-blur-md p-2 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col md:flex-row gap-4 items-center overflow-hidden">
               <div className="flex overflow-x-auto gap-1 no-scrollbar flex-grow px-2">
                    {initialLines.map((l) => (
                    <button
                        key={l.line.id}
                        onClick={() => setActiveLineId(l.line.id)}
                        className={`px-8 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all text-nowrap flex items-center gap-2 ${
                        activeLineId === l.line.id ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-600"
                        }`}
                    >
                        {l.line.lineCode}
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] ${activeLineId === l.line.id ? "bg-white/20" : "bg-slate-200 text-slate-500"}`}>
                            {l.activeJobs.length}
                        </span>
                    </button>
                    ))}
               </div>
               <div className="h-10 w-px bg-slate-200 hidden md:block"></div>
               <div className="flex gap-2 px-4 flex-wrap">
                    {[
                        { id: 'urgent', label: 'Gấp', icon: <AlertCircle className="w-3 h-3"/>, color: 'text-rose-600 bg-rose-50 border-rose-100' },
                        { id: 'delayed', label: 'Trễ', icon: <Clock className="w-3 h-3"/>, color: 'text-purple-600 bg-purple-50 border-purple-100' },
                        { id: 'stagnant', label: 'Tồn Lâu', icon: <Package className="w-3 h-3"/>, color: 'text-amber-600 bg-amber-50 border-amber-100' },
                        { id: 'noLogo', label: 'Chưa có Logo', icon: <Package className="w-3 h-3"/>, color: 'text-orange-600 bg-orange-50 border-orange-100' },
                        { id: 'hasLogo', label: 'Có Logo', icon: <Package className="w-3 h-3"/>, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilters(prev => ({ ...prev, [f.id]: !prev[f.id as keyof typeof prev] }))}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${filters[f.id as keyof typeof filters] ? f.color : 'bg-white border-slate-100 text-slate-400 font-inter'}`}
                        >
                            {f.label}
                        </button>
                    ))}
               </div>
          </div>
      </div>

      {activeLineDataRaw && (
        <div className="space-y-6">
          <div className="flex justify-between items-end px-4">
             <div>
                <h3 className="text-4xl font-black font-outfit uppercase italic tracking-tighter">Line {activeLineDataRaw.line.lineCode}</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 font-inter">Sản lượng đang vận hành</p>
             </div>
             <div className="text-right">
                <p className="text-4xl font-black font-outfit text-indigo-600">{totalPairs.toLocaleString()} <span className="text-sm text-slate-400 font-bold uppercase font-inter">PRS</span></p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-inter">{filteredJobs.length} ĐƠN HÀNG</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 font-inter">
            {filteredJobs.length > 0 ? (
                filteredJobs.map((item, idx) => {
                const duration = calculateDuration(item.order.leanlineInDate);
                const isUrgent = item.order.isPriority || (item.order.finishDate === new Date().toISOString().split('T')[0]);
                const isDelayed = !!(item.order.finishDate && item.order.finishDate < new Date().toISOString().split('T')[0]);
                const logoStatus = item.order.logoStatus;
                const isStagnant = duration.days >= 2;
                const productType = item.order.productType || "SP";

                return (
                    <div 
                    key={`${item.order.id}-${idx}`}
                    className={`rounded-[2.5rem] shadow-xl border-2 overflow-hidden hover:shadow-2xl transition-all group ${isUrgent ? 'border-rose-400 bg-rose-50/50' : isDelayed ? 'border-purple-400 bg-purple-50/50' : isStagnant ? 'border-amber-400 bg-amber-50/50' : 'bg-white border-slate-50'}`}
                    >
                        <div className={`p-6 border-b flex justify-between items-start ${isUrgent ? 'bg-rose-100/80 border-rose-200' : isDelayed ? 'bg-purple-100/80 border-purple-200' : isStagnant ? 'bg-amber-100/80 border-amber-200' : 'bg-slate-50/30 border-slate-100'}`}>
                            <div>
                                <h3 className="text-3xl font-black tracking-tighter font-outfit italic transition-colors group-hover:text-indigo-600">
                                {item.order.id}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1.5 line-clamp-1">{item.order.articleCode} • {item.order.brand || "NO BRAND"}</p>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded-lg">BOM {item.order.bom}</span>
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-lg">{item.order.moldType}</span>
                                    {item.order.cuttingDie && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-lg">{item.order.cuttingDie}</span>}
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-lg">{productType}</span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                {isUrgent && <span className="text-rose-600 font-black text-[9px] uppercase tracking-widest block mb-1 animate-pulse">! GẤP</span>}
                                {isDelayed && <span className="text-purple-600 font-black text-[9px] uppercase tracking-widest block mb-1">⏰ TRỄ</span>}
                                {isStagnant && <span className="text-amber-600 font-black text-[9px] uppercase tracking-widest block mb-1">⏳ TỒN LÂU</span>}
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-4xl font-black font-outfit text-slate-800">{item.order.quantity?.toLocaleString()}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-inter">Sản lượng (PRS)</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-600 font-inter">{item.order.finishDate ? new Date(item.order.finishDate).toLocaleDateString() : '---'}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic font-inter">Hạn HT</p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-dashed border-slate-100">
                                <div className="flex justify-between items-center px-4 py-2 bg-slate-50 rounded-2xl">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock className="w-3 h-3 text-indigo-500"/> TIME ON LINE</span>
                                    <span className="text-[10px] font-black text-indigo-600 animate-pulse">{duration.text}</span>
                                </div>
                                <div className={`flex justify-between items-center px-4 py-2 rounded-2xl ${item.order.logoStatus === 'Có Logo' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">LOGO STATUS</span>
                                    <span className={`text-[10px] font-black ${item.order.logoStatus === 'Có Logo' ? 'text-emerald-600' : 'text-rose-600'}`}>{item.order.logoStatus || "WAITTING"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
                })
            ) : (
                <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                    <div className="text-5xl mb-4">Empty</div>
                    <p className="text-slate-400 font-black uppercase tracking-widest">Không có đơn hàng phù hợp</p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
