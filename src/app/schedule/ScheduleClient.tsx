"use client";

import React, { useState } from "react";

type Job = {
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
};

type PredictedGroup = {
  id: string;
  bom: string;
  totalQuantity: number;
  items: any[];
  moldType: string;
  cuttingDie: string;
  rawStatus: string;
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

export default function ScheduleClient({ data, rawData }: { data: LineSchedule[], rawData: any[] }) {
  const [activeLineId, setActiveLineId] = useState(data[0]?.id);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const activeLine = data.find((l) => l.id === activeLineId);
  const confirmed = activeLine?.confirmed || [];
  const predicted = activeLine?.predicted || [];

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      const resp = await fetch("/api/sync", { method: "POST" });
      if (resp.ok) {
        alert("Đã làm mới dữ liệu thành công!");
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
    const exportData = rawData.map(o => ({
      "PRO ORDER": o.id,
      "BRAND": o.brand,
      "ARTICLE": o.articleCode,
      "QTY": o.quantity,
      "BOM": o.bom,
      "TYPE": o.moldType,
      "FINISH DATE": o.finishDate,
      "ORIGINAL LINE": o.sourceLine,
      "STATUS": o.rawStatus,
      "NOTE": o.isPriority ? "HÀNG GẤP" : ""
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Schedule");
    writeFile(wb, `KeHoachSuaChua_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalItems = confirmed.length + predicted.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const allInView = [
    ...confirmed.map(j => ({ ...j, type: 'CONFIRMED' as const })),
    ...predicted.map(p => ({ ...p, type: 'PREDICTED' as const }))
  ];

  const displayed = allInView.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="flex items-center gap-6">
           <div className="bg-slate-900 text-white p-4 rounded-3xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
           </div>
           <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dữ liệu hiện tại</p>
              <p className="text-xl font-black text-slate-900 uppercase">Tổng cộng {rawData.length} đơn hàng WIP</p>
           </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleRefresh}
            disabled={syncing}
            className="px-8 py-4 bg-white text-slate-800 border-2 border-slate-200 rounded-3xl font-bold text-sm hover:border-slate-900 transition-all flex items-center gap-2"
          >
            {syncing ? "🔄 Đang đồng bộ..." : "🔄 Làm mới dữ liệu"}
          </button>
          <button 
            onClick={handleExportExcel}
            className="px-8 py-4 bg-emerald-600 text-white rounded-3xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2"
          >
            📥 Tải Excel Tổng quan
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 p-2 bg-slate-200/50 rounded-[2.5rem] border border-slate-200">
        {data.map((line) => (
          <button
            key={line.id}
            onClick={() => { setActiveLineId(line.id); setCurrentPage(1); }}
            className={`px-8 py-4 rounded-[2rem] font-bold text-sm uppercase tracking-widest transition-all ${
              activeLineId === line.id
                ? "bg-white text-slate-900 shadow-xl"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Chuyền {line.lineCode}
            {(line.confirmed.length + line.predicted.length) > 0 && (
              <span className="ml-2 bg-slate-900 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                {line.confirmed.length + line.predicted.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeLine && (
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
          <div className="bg-slate-900 px-12 py-10 text-white flex justify-between items-center">
            <div>
              <h2 className="text-4xl font-black tracking-tight uppercase italic">Điều động Chuyền {activeLine.lineCode}</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">Dự kiến dựa trên năng lực {activeLine.machineCount} máy</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Dự kiến ngày mai</div>
              <div className="text-3xl font-black">{totalItems} NHÓM LỆNH</div>
            </div>
          </div>

          <div className="p-4 md:p-8 overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-4">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">
                  <th className="px-6 py-4">Thứ tự</th>
                  <th className="px-6 py-4">BOM & Khuôn</th>
                  <th className="px-6 py-4 min-w-[150px]">Lệnh Sản Xuất (PRO)</th>
                  <th className="px-6 py-4">Khách hàng</th>
                  <th className="px-6 py-4">Số lượng</th>
                  <th className="px-6 py-4">Hạn hoàn thành</th>
                  <th className="px-6 py-4 text-right">Lưu ý</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((item, idx) => {
                  const seq = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isUrgent = ('isPriority' in item && item.isPriority);
                  
                  return (
                    <tr key={idx} className={`transition-colors shadow-sm ${
                      isUrgent ? 'bg-rose-50 hover:bg-rose-100 border-2 border-rose-300' : 'bg-slate-50 hover:bg-indigo-50'
                    }`}>
                      <td className={`px-6 py-6 rounded-l-[2rem] border-l-8 ${isUrgent ? 'border-rose-600' : 'border-indigo-400'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`text-xl font-black ${isUrgent ? 'text-rose-300' : 'text-slate-300'}`}>{seq < 10 ? `0${seq}` : seq}</span>
                          {isUrgent && <span className="px-3 py-1 bg-rose-600 text-white rounded-full text-[9px] font-black uppercase tracking-tighter">GẤP</span>}
                        </div>
                      </td>
                      <td className="px-6 py-6 border-b border-slate-100">
                         <div className={`font-black text-lg ${isUrgent ? 'text-rose-900' : 'text-slate-900'}`}>#{item.bom}</div>
                         <div className={`text-[10px] uppercase font-bold mt-1 ${isUrgent ? 'text-rose-600' : 'text-slate-500'}`}>Khuôn: {item.moldType}</div>
                         <div className={`text-[10px] uppercase font-bold mt-1 ${isUrgent ? 'text-rose-700' : 'text-slate-600'}`}>Dao chặt: {item.cuttingDie || "---"}</div>
                      </td>
                      <td className="px-6 py-6">
                         <div className="text-[11px] font-bold whitespace-pre-line leading-tight text-slate-600">
                           {'orderId' in item ? item.orderId?.split(',').join('\n') : item.items.map((i: any) => i.id).join('\n')}
                         </div>
                      </td>
                      <td className="px-6 py-6 font-black text-slate-400 uppercase text-xs">
                         {'brand' in item ? item.brand : item.items[0]?.brand}
                      </td>
                      <td className={`px-6 py-6 font-black text-2xl ${isUrgent ? 'text-rose-700' : 'text-slate-700'}`}>
                         {'qty' in item ? item.qty : item.totalQuantity}
                      </td>
                      <td className={`px-6 py-6 font-bold text-sm ${isUrgent ? 'text-rose-600 bg-rose-100/50 rounded-xl' : 'text-slate-500'}`}>
                         {new Date('estimatedEndTime' in item ? (item.estimatedEndTime || 0) : item.minFinishDate).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-6 rounded-r-[2rem] text-right">
                         <div className={`text-[11px] font-bold uppercase tracking-widest ${isUrgent ? 'text-rose-600 animate-pulse bg-rose-100/50 inline-block px-3 py-1 rounded-xl' : 'text-slate-400'}`}>
                           {isUrgent ? 'GẤP - ' + (item.rawStatus || 'CHỜ') : ('status' in item ? item.status : item.rawStatus)}
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 py-12">
                 <button 
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   className="p-4 rounded-3xl border border-slate-200 hover:bg-white font-black text-slate-400"
                 >
                   &larr; TRƯỚC
                 </button>
                 <span className="font-black text-xs uppercase tracking-widest text-slate-500">
                    Trang {currentPage} / {totalPages}
                 </span>
                 <button 
                   onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                   className="p-4 rounded-3xl border border-slate-200 hover:bg-white font-black text-slate-400"
                 >
                   SAU &rarr;
                 </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
