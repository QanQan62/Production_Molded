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
    finishDate: string | null;
    leanlineInDate: string | null;
    cuttingDie: string | null;
    targetPerHour: number | null;
    isPriority: boolean | null;
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
    const timer = setInterval(() => setNow(new Date()), 60000); // Cập nhật mỗi phút
    return () => clearInterval(timer);
  }, []);

  const activeLineData = initialLines.find((l) => l.line.id === activeLineId);

  const calculateDuration = (startTime: string | null) => {
    if (!startTime) return "---";
    const start = new Date(startTime);
    const diffMs = now.getTime() - start.getTime();
    if (diffMs <= 0) return "Vừa mới vào";
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let result = "Đã chạy: ";
    if (diffDays > 0) result += `${diffDays} ngày, `;
    result += `${diffHours} giờ, ${diffMins} phút`;
    return result;
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
    const exportData = rawData.map(o => ({
      "PRO ORDER": o.orderId,
      "BOM": o.bom,
      "ARTICLE": o.articleCode,
      "QTY": o.quantity,
      "LINE": o.sourceLine,
      "LEANLINE IN": o.leanlineInDate,
      "FINISH DATE": o.finishDate,
      "MOLD": o.moldType
    }));
    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Monitor");
    writeFile(wb, `GiamSatXuong_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8" style={{ fontFamily: 'Arial, sans-serif' }}>
       {/* Actions */}
       <div className="flex justify-end gap-4 items-center">
        <button 
          onClick={handleRefresh}
          disabled={syncing}
          className="px-6 py-3 bg-white text-slate-800 border-2 border-slate-200 rounded-2xl font-bold text-sm hover:border-slate-900 transition-all flex items-center gap-2 shadow-sm"
        >
          {syncing ? "🔄 Đang đồng bộ..." : "🔄 Làm mới dữ liệu"}
        </button>
        <button 
          onClick={handleExportExcel}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all shadow-lg flex items-center gap-2"
        >
          📥 Tải báo cáo Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-2 bg-slate-200/50 rounded-[2.5rem] border border-slate-200">
        {initialLines.map((l) => (
          <button
            key={l.line.id}
            onClick={() => setActiveLineId(l.line.id)}
            className={`px-8 py-4 rounded-[2rem] font-bold text-sm uppercase tracking-widest transition-all ${
              activeLineId === l.line.id
                ? "bg-slate-900 text-white shadow-xl scale-105"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Chuyền {l.line.lineCode}
            {l.activeJobs.length > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeLineId === l.line.id ? "bg-white text-slate-900" : "bg-slate-900 text-white"
              }`}>
                {l.activeJobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeLineData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeLineData.activeJobs.length > 0 ? (
            activeLineData.activeJobs.map((item, idx) => (
              <div 
                key={`${item.order.id}-${idx}`}
                className={`rounded-[2.5rem] shadow-xl border overflow-hidden hover:shadow-2xl transition-all group ${
                  item.order.isPriority ? "bg-rose-50 border-rose-300" : "bg-white border-slate-100"
                }`}
              >
                {/* Header */}
                <div className={`p-6 border-b flex justify-between items-start ${
                  item.order.isPriority ? "bg-rose-100/50 border-rose-200" : "bg-slate-50 border-slate-100"
                }`}>
                   <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                        item.order.isPriority ? 'text-rose-400' : 'text-slate-400'
                      }`}>PRO Order</p>
                      <h3 className={`text-3xl font-black tracking-tighter transition-colors ${
                        item.order.isPriority ? 'text-rose-900' : 'text-slate-900 group-hover:text-indigo-600'
                      }`}>
                        {item.order.id}
                      </h3>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                         item.order.isPriority ? 'bg-rose-600 text-white' : 'bg-emerald-100 text-emerald-800'
                       }`}>
                          BOM: {item.order.bom}
                       </span>
                       {item.order.isPriority && (
                         <span className="bg-rose-900 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                            HÀNG GẤP
                         </span>
                       )}
                   </div>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                   <div className="flex justify-between items-end">
                      <div>
                         <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                           item.order.isPriority ? 'text-rose-400' : 'text-slate-400'
                         }`}>Số lượng</p>
                         <p className={`text-4xl font-black ${
                           item.order.isPriority ? 'text-rose-700' : 'text-slate-900'
                         }`}>{item.order.quantity}</p>
                      </div>
                      <div className="text-right">
                         <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 italic ${
                           item.order.isPriority ? 'text-rose-400' : 'text-slate-400'
                         }`}>Hạn hoàn thành</p>
                         <p className={`text-sm font-bold ${
                           item.order.isPriority ? 'text-rose-600' : 'text-slate-600'
                         }`}>
                           {item.order.finishDate ? new Date(item.order.finishDate).toLocaleDateString('vi-VN') : '---'}
                         </p>
                      </div>
                   </div>

                   <div className={`pt-6 border-t border-dashed ${
                     item.order.isPriority ? 'border-rose-200' : 'border-slate-200'
                   }`}>
                      <div className="flex justify-between items-center mb-4">
                         <div className="space-y-1">
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${
                              item.order.isPriority ? 'text-rose-400' : 'text-slate-400'
                            }`}>Thời gian trên chuyền</p>
                            <p className={`text-lg font-black animate-pulse ${
                              item.order.isPriority ? 'text-rose-600' : 'text-indigo-600'
                            }`}>
                               {calculateDuration(item.order.leanlineInDate)}
                            </p>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                         <div className={`p-4 rounded-2xl flex justify-between items-center ${
                           item.order.isPriority ? 'bg-rose-100/50 text-rose-900' : 'bg-slate-50 text-slate-700'
                         }`}>
                            <span className="text-[10px] font-bold uppercase">Mã khuôn</span>
                            <span className="text-sm font-black truncate max-w-[150px]">{item.order.moldType}</span>
                         </div>
                         <div className={`p-4 rounded-2xl flex justify-between items-center ${
                           item.order.isPriority ? 'bg-rose-100/50 text-rose-900' : 'bg-slate-50 text-slate-700'
                         }`}>
                             <span className="text-[10px] font-bold uppercase">Dao chặt</span>
                             <span className="text-sm font-black truncate max-w-[150px]">{item.order.cuttingDie || "---"}</span>
                         </div>
                         <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className={`p-4 rounded-2xl ${
                              item.order.isPriority ? 'bg-rose-100/50 text-rose-900' : 'bg-slate-50 text-slate-700'
                            }`}>
                               <p className="text-[8px] font-bold uppercase mb-1">Article</p>
                               <p className="text-[11px] font-black truncate">{item.order.articleCode}</p>
                            </div>
                            <div className={`p-4 rounded-2xl ${
                              item.order.isPriority ? 'bg-rose-100/50 text-rose-900' : 'bg-slate-50 text-slate-700'
                            }`}>
                               <p className="text-[8px] font-bold uppercase mb-1">Target/h</p>
                               <p className="text-[11px] font-black truncate">{item.order.targetPerHour || "---"}</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            ))
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
