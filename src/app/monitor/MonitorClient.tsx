"use client";

import React, { useState, useEffect } from "react";

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
  const [syncing, setSyncing] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  const activeLineData = initialLines.find((l) => l.line.id === activeLineId);

  const calculateDuration = (startTime: string | null) => {
    if (!startTime) return { text: "---", days: 0 };
    const start = new Date(startTime);
    const diffMs = now.getTime() - start.getTime();
    if (diffMs <= 0) return { text: "Vừa mới vào", days: 0 };
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let result = "";
    if (diffDays > 0) result += `${diffDays} ngày, `;
    result += `${diffHours} giờ, ${diffMins} phút`;
    return { text: result, days: diffDays };
  };

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      window.location.reload();
    } catch (e) {
      alert("Lỗi khi làm mới dữ liệu.");
    } finally {
      setSyncing(false);
    }
  };

  const handleExportExcel = async () => {
    const { utils, writeFile } = await import("xlsx");
    const exportData = rawData.map((o: any) => ({
      "Line": o.sourceLine,
      "Pro order": o.orderId,
      "brand": o.brand,
      "article": o.articleCode,
      "qty": o.quantity,
      "BOM": o.bom,
      "Moldtype": o.moldType,
      "ProductType": o.productType,
      "#Last": o.cuttingDie,
      "PU description": o.descriptionPU1,
      "FB description": o.descriptionFB,
      "code logo1": o.codeLogo1,
      "finish date": o.finishDate,
      "Leanline In": o.leanlineInDate,
      "Note": `${o.isPriority ? "HÀNG GẤP" : ""} ${o.logoStatus ? `(${o.logoStatus})` : ""} [${o.productType || "---"}]`
    }));
    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Monitor");
    writeFile(wb, `GiamSatChuyen_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-20 px-4" style={{ fontFamily: 'Arial, sans-serif' }}>
       <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 gap-4">
        <div>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giám sát sản xuất</p>
           <p className="text-xl font-black text-slate-900 uppercase">Trực tuyến</p>
        </div>
        <div className="flex gap-4">
            <button 
                onClick={handleRefresh}
                disabled={syncing}
                className="px-6 py-3 bg-white text-slate-800 border-2 border-slate-200 rounded-2xl font-bold text-sm hover:border-slate-900 transition-all flex items-center gap-2 shadow-sm"
            >
                {syncing ? "🔄" : "🔄 Làm mới"}
            </button>
            <button 
                onClick={handleExportExcel}
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all shadow-lg flex items-center gap-2"
            >
                📥 Excel
            </button>
        </div>
      </div>

      <div className="sticky top-4 z-50 flex flex-nowrap overflow-x-auto gap-2 p-2 bg-slate-200/80 backdrop-blur-md rounded-[2.5rem] border border-slate-200 shadow-lg no-scrollbar">
        {initialLines.map((l) => (
          <button
            key={l.line.id}
            onClick={() => setActiveLineId(l.line.id)}
            className={`px-6 md:px-8 py-3 md:py-4 rounded-[2rem] font-bold text-[10px] md:text-sm uppercase tracking-widest transition-all text-nowrap ${
              activeLineId === l.line.id
                ? "bg-slate-900 text-white shadow-xl"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Chuyền {l.line.lineCode}
            {l.activeJobs.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-black ${
                activeLineId === l.line.id ? "bg-white text-slate-900" : "bg-slate-900 text-white"
              }`}>
                {l.activeJobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeLineData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeLineData.activeJobs.length > 0 ? (
            activeLineData.activeJobs.map((item, idx) => {
               const duration = calculateDuration(item.order.leanlineInDate);
               const isUrgent = item.order.isPriority || (item.order.finishDate === new Date().toISOString().split('T')[0]);
               const isDelayed = !!(item.order.finishDate && item.order.finishDate < new Date().toISOString().split('T')[0]);
               const logoStatus = item.order.logoStatus;
               const isStagnant = duration.days >= 2 || logoStatus === "Chưa có Logo";
               const productType = item.order.productType || "---";

               let bgColor = "bg-white border-slate-100 text-slate-900";
               let headerColor = "bg-slate-50 border-slate-100";
               let labelColor = "text-slate-400";
               let urgentLabel = "";

               if (isUrgent) {
                   bgColor = "bg-rose-50 border-rose-200 text-rose-900 shadow-rose-100";
                   headerColor = "bg-rose-100/50 border-rose-100";
                   labelColor = "text-rose-400";
                   urgentLabel = "HÀNG GẤP";
               } else if (isDelayed) {
                   bgColor = "bg-purple-50 border-purple-200 text-purple-900 shadow-purple-100";
                   headerColor = "bg-purple-100/50 border-purple-100";
                   labelColor = "text-purple-400";
                   urgentLabel = "TRỄ TIẾN ĐỘ";
               } else if (isStagnant) {
                   bgColor = "bg-amber-50 border-amber-200 text-amber-900 shadow-amber-100";
                   headerColor = "bg-amber-100/50 border-amber-100";
                   labelColor = "text-amber-400";
                   urgentLabel = logoStatus === "Chưa có Logo" ? "CHƯA LOGO" : "TỒN LÂU";
               }

               return (
                <div 
                  key={`${item.order.id}-${idx}`}
                  className={`rounded-[2.5rem] shadow-xl border overflow-hidden hover:shadow-2xl transition-all group ${bgColor}`}
                >
                  <div className={`p-6 border-b flex justify-between items-start ${headerColor}`}>
                     <div>
                        <p className={`text-[8px] font-bold uppercase tracking-widest mb-1 ${labelColor}`}>RPRO Order</p>
                        <h3 className="text-3xl font-black tracking-tighter transition-colors group-hover:text-indigo-600">
                          {item.order.id}
                        </h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 italic">Brand: {item.order.brand || "---"}</p>
                     </div>
                     <div className="flex flex-col items-end gap-2 text-right">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isUrgent ? 'bg-rose-600' : isDelayed ? 'bg-purple-600' : isStagnant ? 'bg-amber-600' : 'bg-slate-900'} text-white`}>
                            BOM: {item.order.bom}
                         </span>
                         {urgentLabel && (
                          <span className={`${isUrgent ? 'bg-rose-900' : isDelayed ? 'bg-purple-900' : 'bg-amber-900'} text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse`}>
                             {urgentLabel}
                          </span>
                         )}
                         <div className="flex gap-1 justify-end">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-slate-900 text-white">
                                {productType}
                            </span>
                            {logoStatus && (
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${logoStatus === 'Có Logo' ? 'bg-emerald-100 text-emerald-700' : logoStatus === 'Chưa có Logo' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {logoStatus}
                                </span>
                            )}
                         </div>
                     </div>
                  </div>

                  <div className="p-6 space-y-4">
                     <div className="flex justify-between items-end">
                        <div className="flex-1">
                           <p className={`text-[8px] font-bold uppercase tracking-widest mb-1 ${labelColor}`}>Số lượng: <span className="text-xl font-black">{item.order.quantity}</span></p>
                           <p className="text-[9px] font-black text-slate-600 line-clamp-1 italic bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                             Art: {item.order.articleCode || "---"}
                           </p>
                        </div>
                        <div className="text-right">
                           <p className={`text-[8px] font-bold uppercase tracking-widest mb-1 italic ${labelColor}`}>Hạn HT</p>
                           <p className="text-sm font-bold">
                             {item.order.finishDate ? new Date(item.order.finishDate).toLocaleDateString('vi-VN') : '---'}
                           </p>
                        </div>
                     </div>

                     <div className="pt-4 border-t border-dashed border-black/10">
                        <div className="flex justify-between items-center mb-2">
                           <div className="space-y-1">
                              <p className={`text-[8px] font-bold uppercase tracking-widest ${labelColor}`}>Thời gian trên chuyền</p>
                              <p className="text-sm font-black animate-pulse text-indigo-600">
                                 {duration.text}
                              </p>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                           <div className="p-3 bg-black/5 rounded-2xl flex justify-between items-center">
                              <span className="text-[8px] font-bold uppercase">Mã khuôn</span>
                              <span className="text-[10px] font-black">{item.order.moldType}</span>
                           </div>
                           <div className="p-3 bg-black/5 rounded-2xl flex justify-between items-center">
                              <span className="text-[8px] font-bold uppercase">Dao chặt</span>
                              <span className="text-[10px] font-black">{item.order.cuttingDie || "---"}</span>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
               )
            })
          ) : (
            <div className="col-span-full py-40 text-center bg-white rounded-[3rem] shadow-inner border-2 border-dashed border-slate-100">
               <div className="text-6xl mb-4">🧊</div>
               <p className="text-slate-400 font-bold uppercase tracking-widest">Chuyền hiện đang trống</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
