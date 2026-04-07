"use client";

import React, { useState, useRef } from "react";

export default function PriorityClient({ orders, initialPriority }: { orders: any[], initialPriority: any[] }) {
  const [loading, setLoading] = useState(false);
  const [newPriority, setNewPriority] = useState({ orderId: "", newFinishDate: "", reason: "HÀNG GẤP" });
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!newPriority.orderId || !newPriority.newFinishDate) return;
    setLoading(true);
    try {
      const resp = await fetch("/api/priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPriority),
      });
      if (resp.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa chế độ gấp cho đơn này?")) return;
    setLoading(true);
    try {
      await fetch(`/api/priority?id=${id}`, { method: "DELETE" });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setUploadStatus("Đang đọc file Excel...");
    try {
      const { read, utils } = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = utils.sheet_to_json(ws, { header: 1 });

      // Bỏ header row nếu có
      const dataRows = rows.filter((row, idx) => {
        if (idx === 0) {
          // Nếu dòng đầu chứa text không phải PRO ORDER thì skip
          const first = String(row[0] || "").trim();
          if (first && !first.match(/^PRO/i)) return false;
          if (first.toLowerCase().includes("order") || first.toLowerCase().includes("mã")) return false;
        }
        return row[0] && row[1];
      });

      let successCount = 0;
      let failCount = 0;

      for (const row of dataRows) {
        const orderId = String(row[0]).trim();
        let newFinishDate = "";

        // Xử lý ngày: có thể là chuỗi hoặc số Excel serial
        const dateVal = row[1];
        if (typeof dateVal === "number") {
          // Excel serial date
          const date = new Date((dateVal - 25569) * 86400 * 1000);
          newFinishDate = date.toISOString().split("T")[0];
        } else {
          // Thử parse chuỗi ngày
          const parsed = new Date(String(dateVal).trim());
          if (!isNaN(parsed.getTime())) {
            newFinishDate = parsed.toISOString().split("T")[0];
          }
        }

        if (!orderId || !newFinishDate) {
          failCount++;
          continue;
        }

        try {
          const resp = await fetch("/api/priority", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, newFinishDate, reason: "HÀNG GẤP (Excel)" }),
          });
          if (resp.ok) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }

      setUploadStatus(`Hoàn tất: ${successCount} đơn thành công, ${failCount} lỗi.`);
      if (successCount > 0) {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      console.error(err);
      setUploadStatus("Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Upload Excel */}
      <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-dashed border-rose-200">
        <h2 className="text-xl font-bold mb-4 uppercase tracking-widest text-slate-600">📤 Upload Excel Đơn Gấp</h2>
        <p className="text-sm text-slate-500 mb-6">
          File Excel cần có: <strong>Cột 1</strong> = Mã đơn (PRO ORDER), <strong>Cột 2</strong> = Ngày Finish Date mới.
        </p>
        <div className="flex items-center gap-4">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelUpload}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-sm file:font-bold file:bg-rose-600 file:text-white hover:file:bg-rose-700 file:cursor-pointer file:transition-all"
          />
          {loading && <span className="text-sm font-bold text-rose-500 animate-pulse">Đang xử lý...</span>}
        </div>
        {uploadStatus && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-sm font-bold text-rose-700">
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Section 2: Manual Add */}
      <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200">
        <h2 className="text-xl font-bold mb-6 uppercase tracking-widest text-slate-600">Thêm đơn gấp thủ công</h2>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Chọn Đơn hàng</label>
            <select 
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-rose-500"
              value={newPriority.orderId}
              onChange={e => setNewPriority({ ...newPriority, orderId: e.target.value })}
            >
              <option value="">-- Chọn PRO ORDER --</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>{o.id} | {o.brand} | BOM {o.bom}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Hạn Hoàn Thành Mới</label>
            <input 
              type="date" 
              className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-800 outline-none focus:border-rose-500"
              value={newPriority.newFinishDate}
              onChange={e => setNewPriority({ ...newPriority, newFinishDate: e.target.value })}
            />
          </div>
          <button 
            disabled={loading}
            onClick={handleAdd}
            className="p-4 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all uppercase tracking-widest whitespace-nowrap"
          >
            {loading ? "Đang xử lý..." : "Thiết lập GẤP"}
          </button>
        </div>
      </div>

      {/* Section 3: Table of existing priority orders */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] font-bold tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-8 py-5">PRO ORDER</th>
              <th className="px-8 py-5">Thông tin hàng</th>
              <th className="px-8 py-5">Hạn hoàn thành GẤP</th>
              <th className="px-8 py-5 text-right">Quản lý</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {initialPriority.map(p => {
               const orderInfo = orders.find(o => o.id === p.orderId);
               return (
                <tr key={p.id} className="bg-rose-50/50 hover:bg-rose-100/50 transition-colors">
                  <td className="px-8 py-6">
                     <div className="font-black text-rose-700 text-lg">{p.orderId}</div>
                  </td>
                  <td className="px-8 py-6">
                     <p className="text-xs font-bold text-slate-500">{orderInfo?.brand} | BOM {orderInfo?.bom}</p>
                  </td>
                  <td className="px-8 py-6 font-black text-slate-900">
                     {new Date(p.newFinishDate).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-8 py-6 text-right">
                     <button 
                       onClick={() => handleDelete(p.id)}
                       className="text-slate-400 hover:text-red-600 font-bold text-xs uppercase"
                     >
                       Bỏ gấp
                     </button>
                  </td>
                </tr>
               )
            })}
            {initialPriority.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold uppercase italic">
                   Không có đơn nào đang được thiết lập GẤP.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
