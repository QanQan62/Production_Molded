"use client";

import React, { useState } from "react";

export default function RulesClient({ lines, initialRules, fieldOptions }: { lines: any[], initialRules: any[], fieldOptions: Record<string, string[]> }) {
  const [rules, setRules] = useState(initialRules);
  const [loading, setLoading] = useState(false);
  const [lineId, setLineId] = useState(lines[0]?.id || "");
  const [attributes, setAttributes] = useState([{ ruleType: "BRAND", ruleValue: "", min: "", max: "" }]);

  const handleAddAttribute = () => {
    setAttributes([...attributes, { ruleType: "BRAND", ruleValue: "", min: "", max: "" }]);
  };

  const handleRemoveAttribute = (index: number) => {
    if (attributes.length > 1) {
      setAttributes(attributes.filter((_, i) => i !== index));
    }
  };

  const handleAttributeChange = (index: number, field: string, value: string) => {
    const newAttrs = [...attributes];
    (newAttrs[index] as any)[field] = value;
    if (field === 'ruleType') newAttrs[index].ruleValue = "";
    setAttributes(newAttrs);
  };

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ ruleType: "", ruleValue: "", min: "", max: "" });

  const handleEditClick = (rule: any) => {
    setEditingId(rule.id);
    let min = "", max = "";
    if (rule.ruleType === 'TOTAL_QTY_RANGE') {
      [min, max] = rule.ruleValue.split('-');
    }
    setEditForm({ ruleType: rule.ruleType, ruleValue: rule.ruleValue, min: min || "", max: max || "" });
  };

  const handleUpdate = async () => {
    let finalValue = editForm.ruleValue;
    if (editForm.ruleType === 'TOTAL_QTY_RANGE') {
      if (!editForm.min || !editForm.max) return;
      finalValue = `${editForm.min}-${editForm.max}`;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/line-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ruleType: editForm.ruleType, ruleValue: finalValue }),
      });
      if (resp.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setEditingId(null);
    }
  };

  const handleAdd = async () => {
    setLoading(true);
    try {
      for (const attr of attributes) {
        let finalValue = attr.ruleValue;
        if (attr.ruleType === 'TOTAL_QTY_RANGE') {
          if (!attr.min || !attr.max) continue;
          finalValue = `${attr.min}-${attr.max}`;
        }
        if (!finalValue) continue;

        await fetch("/api/line-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lineId, ruleType: attr.ruleType, ruleValue: finalValue }),
        });
      }
      window.location.reload();
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

  const handleDeleteAll = async () => {
    if (!confirm("Xóa TẤT CẢ các rule đang có?")) return;
    setLoading(true);
    try {
      await fetch(`/api/line-rules?id=all`, { method: "DELETE" });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Group rules by lineId for better display
  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.lineId]) acc[rule.lineId] = [];
    acc[rule.lineId].push(rule);
    return acc;
  }, {} as Record<string, any[]>);

  const getRuleTypeLabel = (type: string) => {
    switch(type) {
        case 'BRAND': return 'Brand';
        case 'MOLD': return 'Mã Khuôn (MOLDTYPE)';
        case 'ARTICLE': return 'Article';
        case 'PRODUCT_TYPE': return 'Product Type (1k1s, 1k3s, SP)';
        case 'TOTAL_QTY_GT': return 'Tổng Qty BOM (Lớn hơn)';
        case 'TOTAL_QTY_LT': return 'Tổng Qty BOM (Nhỏ hơn)';
        case 'TOTAL_QTY_RANGE': return 'Tổng Qty BOM (Trong Khoảng)';
        case 'THANG_HOA': return 'Có/Không Thăng Hoa';
        case 'OVERFLOW_ALLOW': return 'Nhận đơn tràn từ Line';
        case 'OVERFLOW_DENY': return 'Không nhận đơn tràn từ Line';
        default: return type;
    }
  };

  return (
    <div className="space-y-8" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200">
        <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold uppercase tracking-widest text-slate-400">Thiết lập Quy Tắc</h2>
            <button 
                onClick={handleDeleteAll}
                disabled={loading}
                className="bg-slate-100 text-slate-500 px-6 py-3 rounded-2xl font-bold text-xs uppercase hover:bg-red-50 hover:text-red-500 transition-all"
            >
                Xóa tất cả rules
            </button>
        </div>
        
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 max-w-xs">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Chọn Chuyền</label>
            <select 
              className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold outline-none focus:border-indigo-500"
              value={lineId}
              onChange={e => setLineId(e.target.value)}
            >
              {lines.map(l => <option key={l.id} value={l.id}>Chuyền {l.lineCode}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Danh sách thuộc tính</label>
            {attributes.map((attr, index) => {
              const selectedOptions = fieldOptions[attr.ruleType] || [];
              return (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Loại thuộc tính</label>
                    <select 
                      className="p-3 bg-white border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-indigo-500 text-sm"
                      value={attr.ruleType}
                      onChange={e => handleAttributeChange(index, 'ruleType', e.target.value)}
                    >
                      <option value="BRAND">Brand</option>
                      <option value="MOLD">Mã Khuôn (MOLDTYPE)</option>
                      <option value="ARTICLE">Article</option>
                      <option value="PRODUCT_TYPE">Product Type (1k1s, 1k3s, SP)</option>
                      <option value="TOTAL_QTY_GT">Tổng Qty BOM (Lớn hơn)</option>
                      <option value="TOTAL_QTY_LT">Tổng Qty BOM (Nhỏ hơn)</option>
                      <option value="TOTAL_QTY_RANGE">Tổng Qty BOM (Trong Khoảng)</option>
                      <option value="THANG_HOA">Có/Không Thăng Hoa</option>
                      <option value="OVERFLOW_ALLOW">Nhận đơn tràn từ Line</option>
                      <option value="OVERFLOW_DENY">Không nhận đơn tràn từ Line</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Giá trị</label>
                    {attr.ruleType === 'TOTAL_QTY_RANGE' ? (
                        <div className="flex gap-2">
                            <input 
                                type="number"
                                placeholder="Từ..."
                                className="w-1/2 p-3 bg-white border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-indigo-500 text-sm"
                                value={attr.min}
                                onChange={e => handleAttributeChange(index, 'min', e.target.value)}
                            />
                            <input 
                                type="number"
                                placeholder="Đến..."
                                className="w-1/2 p-3 bg-white border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-indigo-500 text-sm"
                                value={attr.max}
                                onChange={e => handleAttributeChange(index, 'max', e.target.value)}
                            />
                        </div>
                    ) : attr.ruleType.startsWith('TOTAL_QTY') ? (
                       <input 
                         type="number"
                         placeholder="Nhập số lượng..."
                         className="p-3 bg-white border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-indigo-500 text-sm"
                         value={attr.ruleValue}
                         onChange={e => handleAttributeChange(index, 'ruleValue', e.target.value)}
                       />
                    ) : (
                        <select 
                        className="p-3 bg-white border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-indigo-500 text-sm"
                        value={attr.ruleValue}
                        onChange={e => handleAttributeChange(index, 'ruleValue', e.target.value)}
                        >
                        <option value="">-- Chọn giá trị --</option>
                        {selectedOptions.map((opt: string, idx: number) => (
                            <option key={idx} value={opt}>{opt}</option>
                        ))}
                        </select>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRemoveAttribute(index)}
                      className="p-3 text-red-400 hover:text-red-600 font-bold text-xs uppercase"
                    >
                      Loại bỏ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleAddAttribute}
              className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
            >
              + Thêm thuộc tính
            </button>
            <button 
              disabled={loading}
              onClick={handleAdd}
              className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all uppercase tracking-widest"
            >
              {loading ? "Đang lưu..." : "Lưu Rule"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] font-bold tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-8 py-5">Chuyền</th>
              <th className="px-8 py-5">Danh sách Rule</th>
              <th className="px-8 py-5 text-right">Quản lý</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {Object.entries(groupedRules).map(([lId, lineRulesArr]) => (
              <tr key={lId} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6 font-black text-slate-900 align-top">
                   Chuyền {lines.find(l => l.id === lId)?.lineCode || lId}
                </td>
                <td className="px-8 py-6">
                   <div className="flex flex-wrap gap-2">
                      {lineRulesArr.map(rule => (
                        <div key={rule.id} className={`border rounded-xl p-3 flex flex-col gap-1 relative group/item transition-all ${editingId === rule.id ? 'bg-white shadow-lg border-indigo-400 ring-4 ring-indigo-50' : 'bg-indigo-50 border-indigo-100'}`}>
                          {editingId === rule.id ? (
                            <div className="space-y-3">
                              <select 
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none"
                                value={editForm.ruleType}
                                onChange={e => setEditForm({ ...editForm, ruleType: e.target.value, ruleValue: "" })}
                              >
                                <option value="BRAND">Brand</option>
                                <option value="MOLD">Mã Khuôn (MOLDTYPE)</option>
                                <option value="ARTICLE">Article</option>
                                <option value="PRODUCT_TYPE">Product Type (1k1s, 1k3s, SP)</option>
                                <option value="TOTAL_QTY_GT">Tổng Qty BOM (Lớn hơn)</option>
                                <option value="TOTAL_QTY_LT">Tổng Qty BOM (Nhỏ hơn)</option>
                                <option value="TOTAL_QTY_RANGE">Tổng Qty BOM (Trong Khoảng)</option>
                                <option value="THANG_HOA">Có/Không Thăng Hoa</option>
                                <option value="OVERFLOW_ALLOW">Nhận đơn tràn từ Line</option>
                                <option value="OVERFLOW_DENY">Không nhận đơn tràn từ Line</option>
                              </select>

                              {editForm.ruleType === 'TOTAL_QTY_RANGE' ? (
                                <div className="flex gap-1">
                                    <input type="number" placeholder="Từ" className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold" value={editForm.min} onChange={e => setEditForm({...editForm, min: e.target.value})} />
                                    <input type="number" placeholder="Đến" className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold" value={editForm.max} onChange={e => setEditForm({...editForm, max: e.target.value})} />
                                </div>
                              ) : editForm.ruleType.startsWith('TOTAL_QTY') ? (
                                <input type="number" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold" value={editForm.ruleValue} onChange={e => setEditForm({...editForm, ruleValue: e.target.value})} />
                              ) : (
                                <select 
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold"
                                  value={editForm.ruleValue}
                                  onChange={e => setEditForm({ ...editForm, ruleValue: e.target.value })}
                                >
                                  <option value="">-- Chọn --</option>
                                  {(fieldOptions[editForm.ruleType] || []).map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                                </select>
                              )}
                              
                              <div className="flex gap-2 pt-1 border-t border-slate-100">
                                <button onClick={handleUpdate} className="flex-1 py-1 bg-indigo-600 text-white rounded-md text-[9px] font-bold uppercase">Lưu</button>
                                <button onClick={() => setEditingId(null)} className="flex-1 py-1 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold uppercase">Hủy</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                {getRuleTypeLabel(rule.ruleType)}
                              </span>
                              <span className="text-sm font-black text-indigo-700">
                                {rule.ruleType === 'TOTAL_QTY_RANGE' ? `Khoảng ${rule.ruleValue}` : 
                                 rule.ruleType === 'TOTAL_QTY_GT' ? `> ${rule.ruleValue}` : 
                                 rule.ruleType === 'TOTAL_QTY_LT' ? `< ${rule.ruleValue}` : rule.ruleValue}
                              </span>
                              <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                                <button 
                                    onClick={() => handleEditClick(rule)}
                                    className="bg-white border border-indigo-100 text-indigo-500 w-6 h-6 rounded-full flex items-center justify-center hover:bg-indigo-50 shadow-sm"
                                    title="Chỉnh sửa"
                                >
                                  ✎
                                </button>
                                <button 
                                    onClick={() => handleDelete(rule.id)}
                                    className="bg-white border border-red-100 text-red-500 w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-50 shadow-sm"
                                    title="Xóa"
                                >
                                  ×
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                   </div>
                </td>
                <td className="px-8 py-6 text-right align-top">
                    {/* Placeholder for line-wide actions if any */}
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
