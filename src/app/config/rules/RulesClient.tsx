"use client";

import React, { useState } from "react";

export default function RulesClient({ lines, initialRules, fieldOptions }: { lines: any[], initialRules: any[], fieldOptions: Record<string, string[]> }) {
  const [rules, setRules] = useState(initialRules);
  const [loading, setLoading] = useState(false);
  const [newRule, setNewRule] = useState({ lineId: lines[0]?.id || "", ruleType: "BRAND", ruleValue: "" });
  
  const selectedOptions = fieldOptions[newRule.ruleType] || [];

  const handleAdd = async () => {
    if (!newRule.ruleValue) return;
    setLoading(true);
    try {
      const resp = await fetch("/api/line-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule),
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
    if (!confirm("Xóa rule này?")) return;
    setLoading(true);
    try {
      await fetch(`/api/line-rules?id=${id}`, { method: "DELETE" });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200">
        <h2 className="text-xl font-bold mb-6 uppercase tracking-widest text-slate-400">Thêm Rule Mới</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Chọn Chuyền</label>
            <select 
              className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500"
              value={newRule.lineId}
              onChange={e => setNewRule({ ...newRule, lineId: e.target.value })}
            >
              {lines.map(l => <option key={l.id} value={l.id}>Chuyền {l.lineCode}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Thuộc tính</label>
            <select 
              className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500"
              value={newRule.ruleType}
              onChange={e => setNewRule({ ...newRule, ruleType: e.target.value, ruleValue: "" })}
            >
              <option value="BRAND">Brand</option>
              <option value="MOLD">Mã Khuôn (MOLDTYPE)</option>
              <option value="ARTICLE">Article</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Giá trị Điều kiện</label>
            <select 
              className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500"
              value={newRule.ruleValue}
              onChange={e => setNewRule({ ...newRule, ruleValue: e.target.value })}
            >
              <option value="">-- Chọn giá trị --</option>
              {selectedOptions.map((opt: string, idx: number) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <button 
            disabled={loading}
            onClick={handleAdd}
            className="p-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all uppercase tracking-widest"
          >
            {loading ? "Đang lưu..." : "Thêm Rule"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] font-bold tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-8 py-5">Chuyền</th>
              <th className="px-8 py-5">Thuộc tính</th>
              <th className="px-8 py-5">Giá trị gán</th>
              <th className="px-8 py-5 text-right">Quản lý</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rules.map(rule => (
              <tr key={rule.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-6 font-black text-slate-900">
                   Chuyền {lines.find(l => l.id === rule.lineId)?.lineCode || rule.lineId}
                </td>
                <td className="px-8 py-6">
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                     {rule.ruleType}
                   </span>
                </td>
                <td className="px-8 py-6">
                   <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold text-sm uppercase">
                     {rule.ruleValue}
                   </span>
                </td>
                <td className="px-8 py-6 text-right">
                   <button 
                     onClick={() => handleDelete(rule.id)}
                     className="text-red-400 hover:text-red-600 font-bold text-xs uppercase"
                   >
                     Xóa
                   </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={3} className="px-8 py-20 text-center text-slate-400 font-bold uppercase italic">
                   Chưa có rule nào được thiết lập.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
