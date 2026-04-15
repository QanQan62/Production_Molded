"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, X, Search, Crosshair, Tag } from "lucide-react";

export default function MoldsClient({ initialTargets, initialMappings }: { initialTargets: any[], initialMappings: any[] }) {
    const [activeTab, setActiveTab] = useState<'TARGETS' | 'MAPPING'>('TARGETS');
    
    // --- TARGETS STATE ---
    const [targets, setTargets] = useState(initialTargets);
    const [newTarget, setNewTarget] = useState({ moldType: '', targetPerHour: '' });
    
    // --- MAPPING STATE ---
    const [mappings, setMappings] = useState(initialMappings);
    const [newMapping, setNewMapping] = useState({ mold: '', type: '' });
    const [mappingSearch, setMappingSearch] = useState('');

    useEffect(() => {
        if (mappingSearch) {
            const timer = setTimeout(() => fetchMappings(mappingSearch), 500);
            return () => clearTimeout(timer);
        } else {
            fetchMappings('');
        }
    }, [mappingSearch]);

    const fetchTargets = async () => {
        try {
            const res = await fetch("/api/mold-targets");
            const d = await res.json();
            if (d.success) setTargets(d.data);
        } catch (e) {}
    };

    const fetchMappings = async (search: string) => {
        try {
            const res = await fetch(`/api/mold-types-config?search=${encodeURIComponent(search)}`);
            const d = await res.json();
            if (d.success) setMappings(d.data);
        } catch (e) {}
    };

    // --- TARGET HANDLERS ---
    const addTarget = async () => {
        if (!newTarget.moldType || !newTarget.targetPerHour) return;
        try {
            await fetch("/api/mold-targets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ moldType: newTarget.moldType, targetPerHour: newTarget.targetPerHour })
            });
            setNewTarget({ moldType: '', targetPerHour: '' });
            fetchTargets();
        } catch (e) {
            alert("Lỗi lưu target");
        }
    };

    const deleteTarget = async (id: string) => {
        if (!confirm("Bạn có chắc chắn?")) return;
        try {
            await fetch(`/api/mold-targets?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            fetchTargets();
        } catch (e) {}
    };

    // --- MAPPING HANDLERS ---
    const addMapping = async () => {
        if (!newMapping.mold || !newMapping.type) return;
        try {
            await fetch("/api/mold-types-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mold: newMapping.mold, type: newMapping.type })
            });
            setNewMapping({ mold: '', type: '' });
            fetchMappings(mappingSearch);
        } catch (e) {
            alert("Lỗi lưu mapping");
        }
    };

    const deleteMapping = async (id: string) => {
        if (!confirm("Bạn có chắc chắn?")) return;
        try {
            await fetch(`/api/mold-types-config?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            fetchMappings(mappingSearch);
        } catch (e) {}
    };

    return (
        <div className="max-w-7xl mx-auto flex flex-col items-center">
            {/* Tabs */}
            <div className="flex w-full overflow-hidden bg-slate-200 rounded-2xl mb-8 p-1">
                <button 
                    onClick={() => setActiveTab('TARGETS')}
                    className={`flex-1 py-4 font-black text-sm uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-2 ${activeTab === 'TARGETS' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:bg-slate-300'}`}
                >
                    <Crosshair className="w-4 h-4"/> Định mức
                </button>
                <button 
                    onClick={() => setActiveTab('MAPPING')}
                    className={`flex-1 py-4 font-black text-sm uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-2 ${activeTab === 'MAPPING' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:bg-slate-300'}`}
                >
                    <Tag className="w-4 h-4"/> Phân loại
                </button>
            </div>

            {/* TAB CONTENT: TARGETS */}
            {activeTab === 'TARGETS' && (
                <div className="w-full bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100">
                    <h2 className="text-2xl font-black mb-6">Định mức Sản lượng / Máy / Giờ</h2>
                    
                    <div className="flex gap-4 p-4 bg-emerald-50 rounded-2xl mb-8 items-center flex-wrap">
                        <input 
                            placeholder="Tên loại khuôn (VD: 1K3S)" 
                            className="px-4 py-3 border rounded-xl flex-1 focus:border-emerald-500 outline-none font-bold uppercase"
                            value={newTarget.moldType}
                            onChange={(e) => setNewTarget({...newTarget, moldType: e.target.value.toUpperCase()})}
                        />
                        <input 
                            placeholder="Target (đôi/giờ)" 
                            type="number"
                            className="px-4 py-3 border rounded-xl w-32 focus:border-emerald-500 outline-none font-black"
                            value={newTarget.targetPerHour}
                            onChange={(e) => setNewTarget({...newTarget, targetPerHour: e.target.value})}
                        />
                        <button onClick={addTarget} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black hover:bg-emerald-700 hover:shadow-lg transition flex items-center gap-2 uppercase text-[10px] tracking-widest h-full">
                            <Plus className="w-4 h-4" /> THÊM
                        </button>
                    </div>

                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                                <th className="pb-4 px-4">Loại Khuôn</th>
                                <th className="pb-4 px-4">Target (đôi/giờ)</th>
                                <th className="pb-4 px-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {targets.map(t => (
                                <tr key={t.moldType} className="bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <td className="p-4 rounded-l-2xl font-black text-slate-800 text-sm">
                                        {t.moldType}
                                    </td>
                                    <td className="p-4 font-black text-emerald-600 text-xl font-outfit">
                                        {t.targetPerHour} <span className="text-[10px] text-slate-400 uppercase tracking-widest">prs/h</span>
                                    </td>
                                    <td className="p-4 rounded-r-2xl text-right">
                                        <button onClick={() => deleteTarget(t.moldType)} className="p-3 text-rose-500 hover:bg-rose-100 rounded-xl transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB CONTENT: MAPPING */}
            {activeTab === 'MAPPING' && (
                <div className="w-full bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100">
                    <h2 className="text-2xl font-black mb-6">Mã Khuôn → Trỏ vào Loại Nhóm</h2>
                    
                    <div className="flex flex-col md:flex-row gap-4 p-4 bg-indigo-50 rounded-2xl mb-8 items-center">
                        <div className="flex w-full gap-4 flex-wrap items-center">
                            <input 
                                placeholder="Mã khuôn cụ thể (VD: 1978, A452)" 
                                className="px-4 py-3 border rounded-xl flex-1 focus:border-indigo-500 outline-none font-bold uppercase"
                                value={newMapping.mold}
                                onChange={(e) => setNewMapping({...newMapping, mold: e.target.value.toUpperCase()})}
                            />
                            <div className="font-black text-slate-300">→</div>
                            <input 
                                placeholder="Nhóm (VD: 1K3S)" 
                                className="px-4 py-3 border rounded-xl w-32 focus:border-indigo-500 outline-none font-black font-outfit uppercase"
                                value={newMapping.type}
                                onChange={(e) => setNewMapping({...newMapping, type: e.target.value.toUpperCase()})}
                            />
                            <button onClick={addMapping} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black hover:bg-indigo-700 hover:shadow-lg transition flex items-center gap-2 uppercase text-[10px] tracking-widest h-full">
                                <Save className="w-4 h-4" /> LƯU
                            </button>
                        </div>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            placeholder="Tìm mã khuôn hoặc nhóm..."
                            value={mappingSearch}
                            onChange={(e) => setMappingSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold"
                        />
                    </div>

                    <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead>
                                <tr className="text-[10px] uppercase font-black tracking-widest text-slate-400 relative z-10 bg-white">
                                    <th className="pb-4 px-4 sticky top-0 bg-white pt-2">Mã Khuôn</th>
                                    <th className="pb-4 px-4 sticky top-0 bg-white pt-2">Thuộc Nhóm</th>
                                    <th className="pb-4 px-4 text-right sticky top-0 bg-white pt-2">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mappings.map(m => (
                                    <tr key={m.mold} className="bg-slate-50 hover:bg-slate-100 transition-colors">
                                        <td className="p-4 rounded-l-2xl font-black text-slate-800 text-sm truncate max-w-xs">
                                            {m.mold}
                                        </td>
                                        <td className="p-4 font-black">
                                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs tracking-widest uppercase">
                                                {m.type}
                                            </span>
                                        </td>
                                        <td className="p-4 rounded-r-2xl text-right">
                                            <button onClick={() => deleteMapping(m.mold)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {mappings.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-center py-8 text-slate-400 font-bold text-sm">
                                            Không có kết quả
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
