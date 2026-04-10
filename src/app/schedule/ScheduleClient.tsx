"use client";

import React, { useState } from "react";

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

export default function ScheduleClient({ data, rawData }: { data: LineSchedule[], rawData: any[] }) {
  const [activeTab, setActiveTab] = useState('SCHEDULE'); 
  const [activeLineId, setActiveLineId] = useState(data[0]?.id);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
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
      "Line sắp vào": o.sourceLine || activeLine?.lineCode, 
      "Pro order": o.orderId || o.id,
      "brand": o.brand,
      "article": o.articleCode,
      "Qty": o.quantity,
      "BOM": o.bom,
      "Moldtype": o.moldType,
      "ProductType": o.productType,
      "#Last": o.cuttingDie,
      "PU description": o.descriptionPU1, 
      "FB description": o.descriptionFB, 
      "code Logo1": o.codeLogo1,
      "Finish date": o.finishDate,
      "Status": o.rawStatus,
      "Note": `${o.isPriority ? "HÀNG GẤP" : ""} ${o.logoStatus ? `(${o.logoStatus})` : ""} [${o.productType || "---"}]`
    }));

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Schedule");
    writeFile(wb, `KeHoachChuyen_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleManualCombineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
        const { read, utils } = await import("xlsx");
        const arrayBuffer = await file.arrayBuffer();
        const wb = read(arrayBuffer);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = utils.sheet_to_json(ws, { header: 1 });
        const dataRows = rows.slice(1).filter(r => r[0] && r[1]); 

        const resp = await fetch("/api/manual-combine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ combines: dataRows.map(r => ({ orderId: String(r[0]).trim(), combineName: String(r[1]).trim() })) })
        });
        if (resp.ok) {
            alert("Đã upload dữ liệu combine thành công!");
            window.location.reload();
        }
    } catch (e) {
        alert("Lỗi khi upload combine.");
    } finally {
        setLoading(false);
    }
  };

  const allInView: Array<Job | PredictedGroup> = [
    ...confirmed.map(j => ({ ...j, type: 'CONFIRMED' as const })),
    ...predicted.map(p => ({ ...p, type: 'PREDICTED' as const }))
  ];

  const totalItems = allInView.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const displayed = allInView.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getRowStyle = (item: any) => {
    const isUrgent = item.isPriority;
    const finishDate = item.type === 'CONFIRMED' ? (item.estimatedEndTime) : (item.minFinishDate ? new Date(item.minFinishDate).toISOString().split('T')[0] : null);
    const isDelayed = finishDate && finishDate < new Date().toISOString().split('T')[0];
    const logoStatus = item.logoStatus;
    const isStagnant = logoStatus === "Chưa có Logo";

    if (isUrgent) return "bg-rose-50 hover:bg-rose-100/80 border-rose-600";
    if (isDelayed) return "bg-purple-50 hover:bg-purple-100/80 border-purple-600";
    if (isStagnant) return "bg-amber-50 hover:bg-amber-100/80 border-amber-600";
    return "bg-slate-50 hover:bg-indigo-50 border-indigo-400";
  };

  const getLabel = (item: any) => {
    const finishDate = item.type === 'CONFIRMED' ? (item.estimatedEndTime) : (item.minFinishDate ? new Date(item.minFinishDate).toISOString().split('T')[0] : null);
    const isDelayed = finishDate && finishDate < new Date().toISOString().split('T')[0];
    const logoStatus = item.logoStatus;
    if (item.isPriority) return "GẤP";
    if (isDelayed) return "TRỄ";
    if (logoStatus === "Chưa có Logo") return "CHƯA LOGO";
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 gap-4">
        <div className="flex items-center gap-6">
           <div className="hidden md:block bg-slate-900 text-white p-4 rounded-3xl">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
           </div>
           <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dữ liệu hiện tại</p>
              <p className="text-xl font-black text-slate-900 uppercase">Tổng cộng {rawData.length} đơn hàng WIP</p>
           </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
                onClick={() => setActiveTab(activeTab === 'SCHEDULE' ? 'CONFIG' : 'SCHEDULE')}
                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-3xl font-bold text-sm hover:bg-slate-200 transition-all font-sans"
          >
              {activeTab === 'SCHEDULE' ? '⚙️ Cấu hình gộp/loại hàng' : '📅 Quay lại Kế hoạch'}
          </button>
          <button 
            onClick={handleRefresh}
            disabled={syncing}
            className="px-8 py-4 bg-white text-slate-800 border-2 border-slate-200 rounded-3xl font-bold text-sm hover:border-slate-900 transition-all flex items-center gap-2"
          >
            {syncing ? "🔄" : "🔄 Làm mới"}
          </button>
          <button 
            onClick={handleExportExcel}
            className="px-8 py-4 bg-emerald-600 text-white rounded-3xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2"
          >
            📥 Excel
          </button>
        </div>
      </div>

      {activeTab === 'CONFIG' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-200">
                  <h3 className="text-xl font-black mb-4 uppercase tracking-tighter">📦 Upload Manual Combine</h3>
                  <p className="text-sm text-slate-500 mb-6">File Excel: Cột 1 = PRO ORDER, Cột 2 = Tên Nhóm Gộp.</p>
                  <input type="file" onChange={handleManualCombineUpload} className="w-full text-sm file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:bg-indigo-600 file:text-white" />
              </div>
          </div>
      ) : (
          <>
            <div className="sticky top-4 z-50 flex flex-nowrap overflow-x-auto gap-2 p-2 bg-slate-200/80 backdrop-blur-md rounded-[2.5rem] border border-slate-200 shadow-lg no-scrollbar">
                {data.map((line) => (
                <button
                    key={line.id}
                    onClick={() => { setActiveLineId(line.id); setCurrentPage(1); }}
                    className={`px-6 md:px-8 py-3 md:py-4 rounded-[2rem] font-bold text-[10px] md:text-sm uppercase tracking-widest transition-all text-nowrap ${
                    activeLineId === line.id
                        ? "bg-white text-slate-900 shadow-md"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                    Chuyền {line.lineCode}
                    {(line.confirmed.length + line.predicted.length) > 0 && (
                    <span className="ml-1 md:ml-2 bg-slate-900 text-white px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-black">
                        {line.confirmed.length + line.predicted.length}
                    </span>
                    )}
                </button>
                ))}
            </div>

            {activeLine && (
                <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
                <div className="bg-slate-900 px-6 md:px-12 py-6 md:py-10 text-white flex justify-between items-center">
                    <div>
                    <h2 className="text-2xl md:text-4xl font-black tracking-tight uppercase italic">Chuyền {activeLine.lineCode}</h2>
                    <p className="hidden md:block text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">Dự kiến dựa trên năng lực {activeLine.machineCount} máy</p>
                    </div>
                    <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Dự kiến</div>
                    <div className="text-xl md:text-3xl font-black">{totalItems} NHÓM LỆNH</div>
                    </div>
                </div>

                <div className="hidden md:block p-8 overflow-x-auto">
                    <table className="w-full border-separate border-spacing-y-4">
                    <thead>
                        <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">
                        <th className="px-6 py-4">Thứ tự</th>
                        <th className="px-6 py-4">BOM & Khuôn</th>
                        <th className="px-6 py-4 min-w-[150px]">Lệnh Sản Xuất (PRO)</th>
                        <th className="px-6 py-4">Khách hàng / Brand</th>
                        <th className="px-6 py-4">Số lượng</th>
                        <th className="px-6 py-4">Hạn hoàn thành</th>
                        <th className="px-6 py-4 text-right">Lưu ý</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayed.map((item, idx) => {
                        const seq = (currentPage - 1) * itemsPerPage + idx + 1;
                        const label = getLabel(item);
                        const rowClass = getRowStyle(item);
                        const logoStatus = item.logoStatus;
                        const productType = item.productType || "---";
                        
                        return (
                            <tr key={idx} className={`transition-all shadow-sm ${rowClass}`}>
                            <td className={`px-6 py-6 rounded-l-[2rem] border-l-8 ${rowClass.split(' ').pop()}`}>
                                <div className="flex items-center gap-3">
                                <span className={`text-xl font-black opacity-40`}>{seq < 10 ? `0${seq}` : seq}</span>
                                {label && (
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                        label === 'GẤP' ? 'bg-rose-600 text-white' : 
                                        label === 'TRỄ' ? 'bg-purple-600 text-white' : 'bg-amber-600 text-white'
                                    }`}>
                                        {label}
                                    </span>
                                )}
                                </div>
                            </td>
                            <td className="px-6 py-6 border-b border-black/5">
                                <div className={`font-black text-lg text-slate-900`}>#{item.bom}</div>
                                <div className="text-[10px] uppercase font-bold mt-1 text-slate-500">Khuôn: {item.moldType}</div>
                                <div className="text-[10px] uppercase font-bold mt-1 text-slate-600">Dao: {item.cuttingDie || "---"}</div>
                            </td>
                            <td className="px-6 py-6">
                                <div className="text-[11px] font-bold whitespace-pre-line leading-tight text-slate-600">
                                {item.type === 'CONFIRMED' ? item.orderId?.split(',').join('\n') : item.items.map((i: any) => i.id).join('\n')}
                                </div>
                            </td>
                            <td className="px-6 py-6">
                                <div className="text-xs font-black text-slate-400 tracking-widest uppercase">
                                    {item.type === 'CONFIRMED' ? item.brand : item.items[0]?.brand}
                                </div>
                            </td>
                            <td className={`px-6 py-6 font-black text-2xl text-slate-700`}>
                                {item.type === 'CONFIRMED' ? item.qty : item.totalQuantity}
                            </td>
                            <td className={`px-6 py-6 font-bold text-sm text-slate-600`}>
                                {new Date((item.type === 'CONFIRMED' ? (item.estimatedEndTime || 0) : item.minFinishDate)).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-6 py-6 rounded-r-[2rem] text-right">
                                <div className="flex flex-col items-end gap-1">
                                    <div className={`text-[10px] font-bold uppercase tracking-widest text-slate-600`}>
                                        {item.type === 'CONFIRMED' ? item.status : item.rawStatus}
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-slate-900 text-white">
                                            {productType}
                                        </span>
                                        {logoStatus && (
                                            <div className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${logoStatus === 'Có Logo' ? 'bg-emerald-100 text-emerald-700' : logoStatus === 'Chưa có Logo' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                                                {logoStatus}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                            </tr>
                        );
                        })}
                    </tbody>
                    </table>
                </div>

                <div className="md:hidden p-4 space-y-4">
                    {displayed.map((item, idx) => {
                        const label = getLabel(item);
                        const rowClass = getRowStyle(item);
                        const logoStatus = item.logoStatus;
                        const productType = item.productType || "---";
                        return (
                            <div key={idx} className={`p-4 rounded-3xl border-l-[10px] shadow-sm ${rowClass}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase">BOM #{item.bom}</div>
                                        <div className="text-lg font-black text-slate-900">{item.moldType}</div>
                                    </div>
                                    {label && <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${
                                        label === 'GẤP' ? 'bg-rose-600 text-white' : 
                                        label === 'TRỄ' ? 'bg-purple-600 text-white' : 'bg-amber-600 text-white'
                                    }`}>{label}</span>}
                                </div>
                                <div className="mt-2 text-[10px] text-slate-600 break-all bg-white/50 p-2 rounded-xl">
                                    {item.type === 'CONFIRMED' ? item.orderId : item.items.map((i: any) => i.id).join(', ')}
                                </div>
                                <div className="mt-3 flex justify-between items-end">
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Hạn trả: {new Date((item.type === 'CONFIRMED' ? (item.estimatedEndTime || 0) : item.minFinishDate)).toLocaleDateString('vi-VN')}</div>
                                        <div className="text-xl font-black text-slate-700">{(item.type === 'CONFIRMED' ? item.qty : item.totalQuantity)} PRS</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-slate-900 text-white w-fit">
                                            {productType}
                                        </span>
                                        {logoStatus && (
                                            <div className={`text-[9px] font-black px-2 py-1 rounded-lg ${logoStatus === 'Có Logo' ? 'bg-emerald-100 text-emerald-700' : logoStatus === 'Chưa có Logo' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {logoStatus}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 py-8">
                    <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-6 py-3 rounded-2xl border border-slate-200 font-bold text-slate-400 text-xs text-nowrap"
                    >
                    &larr; TRƯỚC
                    </button>
                    <span className="font-bold text-[10px] uppercase text-slate-500 text-nowrap">
                        {currentPage} / {totalPages}
                    </span>
                    <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-6 py-3 rounded-2xl border border-slate-200 font-bold text-slate-400 text-xs text-nowrap"
                    >
                    SAU &rarr;
                    </button>
                </div>
                )}
                </div>
            )}
          </>
      )}
    </div>
  );
}
