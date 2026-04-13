"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { 
  RefreshCcw, AlertCircle, Clock, Package, TrendingUp, Filter, 
  CheckCircle2, AlertTriangle, Layers, ChevronRight, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';

const STATUS_MAP: Record<string, string> = {
  '5.WIP IN MOLDING': '5. Thành hình',
  '5.1.WIP SAU MOLDING': '5.1 Sau thành hình',
  '6.WIP IN LEAN LINE': '6. Trong Leanline',
  '7.PACKING': '7. Chờ bù',
  '7.1 RETURN LINE': '7.1 Trả đơn',
  '8.KHO TẠM': '8. Kho tạm'
};

const STATUS_ORDER = [
  '5.WIP IN MOLDING',
  '5.1.WIP SAU MOLDING',
  '6.WIP IN LEAN LINE',
  '7.PACKING',
  '7.1 RETURN LINE',
  '8.KHO TẠM'
];

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

export default function DashboardClient({ allOrders, allLines, allPriority }: { allOrders: any[], allLines: any[], allPriority: any[] }) {
    const router = useRouter();
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'current' | 'planned'>('current');

    const urgentList = useMemo(() => allOrders.filter(o => 
        allPriority.some(p => p.orderId === o.id)
    ), [allOrders, allPriority]);

    const delayedList = useMemo(() => allOrders.filter(o => 
        o.finishDate && o.finishDate < new Date().toISOString().split('T')[0]
    ), [allOrders]);

    const calculateStagnant = (startTime: string | null) => {
        if (!startTime) return 0;
        const start = new Date(startTime);
        const diffMs = new Date().getTime() - start.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    };

    const stagnantList = useMemo(() => allOrders.filter(o => calculateStagnant(o.leanlineInDate) >= 2), [allOrders]);

    const readyToStockList = useMemo(() => 
        allOrders.filter(o => (o.rawStatus || "").split('.')[0] === "8" || (o.rawStatus || "").includes("KHO TẠM"))
    , [allOrders]);

    const readyUrgent = useMemo(() => readyToStockList.filter(o => allPriority.some(p => p.orderId === o.id)), [readyToStockList, allPriority]);
    const readyDelayed = useMemo(() => readyToStockList.filter(o => o.finishDate && o.finishDate < new Date().toISOString().split('T')[0]), [readyToStockList]);
    const readyStagnant = useMemo(() => readyToStockList.filter(o => calculateStagnant(o.leanlineInDate) >= 2), [readyToStockList]);

    const activeList = useMemo(() => {
        if (selectedType === 'URGENT') return urgentList;
        if (selectedType === 'DELAYED') return delayedList;
        if (selectedType === 'STAGNANT') return stagnantList;
        if (selectedType === 'READY_STOCK') return readyToStockList;
        if (selectedType === 'READY_STOCK_URGENT') return readyUrgent;
        if (selectedType === 'READY_STOCK_DELAYED') return readyDelayed;
        if (selectedType === 'READY_STOCK_STAGNANT') return readyStagnant;
        return allOrders;
    }, [selectedType, urgentList, delayedList, stagnantList, readyToStockList, readyUrgent, readyDelayed, readyStagnant, allOrders]);

    const totalStats = useMemo(() => ({
        count: allOrders.length,
        qty: allOrders.reduce((sum, o) => sum + (o.quantity || 0), 0)
    }), [allOrders]);

    const readyStats = useMemo(() => ({
        count: readyToStockList.length,
        qty: readyToStockList.reduce((sum, o) => sum + (o.quantity || 0), 0)
    }), [readyToStockList]);

    const logoStats = useMemo(() => {
        const hasLogo = activeList.filter(o => o.logoStatus === 'Có Logo');
        const noLogo = activeList.filter(o => o.logoStatus === 'Chưa có Logo');
        return { 
            hasLogo: hasLogo.length, 
            hasLogoQty: hasLogo.reduce((s,o)=>s+(o.quantity||0),0), 
            noLogo: noLogo.length, 
            noLogoQty: noLogo.reduce((s,o)=>s+(o.quantity||0),0) 
        };
    }, [activeList]);

    const chartData = useMemo(() => {
        return STATUS_ORDER.map(status => ({
            name: STATUS_MAP[status].split('.')[0], // Short name
            fullName: STATUS_MAP[status],
            value: allOrders.filter(o => (o.rawStatus || "").trim() === status).reduce((sum, o) => sum + (o.quantity || 0), 0),
            count: allOrders.filter(o => (o.rawStatus || "").trim() === status).length
        })).filter(d => d.value > 0);
    }, [allOrders]);

    const lineAllocation = useMemo(() => {
        const sourceData = viewMode === 'current' 
            ? allOrders.filter(o => {
                const s = o.rawStatus || "";
                return s.includes("6.") || s.includes("7.") || s.includes("7.1");
            })
            : allOrders.filter(o => {
                const s = o.rawStatus || "";
                return s.includes("5.") || s.includes("5.1");
            });

        return allLines.map(line => {
            const lineOrders = sourceData.filter(o => 
                viewMode === 'current'
                    ? o.sourceLine?.toUpperCase() === line.lineCode.toUpperCase()
                    : o.plannedLine?.toUpperCase() === line.lineCode.toUpperCase()
            );
            const qty = lineOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
            return {
                name: line.lineCode,
                qty: qty,
                orders: lineOrders.length,
                orderList: lineOrders
            };
        }).sort((a, b) => b.qty - a.qty);
    }, [viewMode, allOrders, allLines]);

    const isWipActive = !selectedType || ['URGENT', 'DELAYED', 'STAGNANT'].includes(selectedType);
    const isReadyActive = selectedType && selectedType.startsWith('READY_STOCK');

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 font-inter">
            {/* Header section with Refresh and Info */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase font-outfit">Sản xuất PPC</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] bg-slate-200 px-3 py-1 rounded-full font-outfit">Live Dashboard</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => router.refresh()}
                        className="flex items-center gap-2 bg-white border-2 border-slate-100 font-black text-[11px] uppercase tracking-widest px-5 py-3 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                    >
                        <RefreshCcw className="w-4 h-4" /> Làm mới dữ liệu
                    </button>
                    <div className="bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest px-6 py-3 rounded-2xl shadow-lg shadow-indigo-100">
                        {new Date().toLocaleDateString('vi-VN')}
                    </div>
                </div>
            </header>

            {/* Main Summary Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Total WIP Master Card */}
                <div 
                    onClick={() => setSelectedType(null)}
                    className={`cursor-pointer group relative overflow-hidden p-8 rounded-[3rem] border-4 transition-all duration-300 ${isWipActive ? 'bg-indigo-600 border-indigo-500 shadow-2xl scale-[1.01]' : 'bg-white border-slate-100 hover:border-indigo-600 shadow-lg'}`}
                >
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full ${isWipActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>Work In Progress</span>
                            <h2 className={`text-4xl md:text-6xl font-black mt-4 tracking-tighter font-outfit ${isWipActive ? 'text-white' : 'text-slate-900'}`}>
                                {totalStats.count} <span className="text-lg opacity-50 ml-1">đơn</span>
                            </h2>
                            <p className={`text-xl font-bold mt-1 ${isWipActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                                {totalStats.qty.toLocaleString()} <span className="text-xs uppercase font-black opacity-60">đôi (PRS)</span>
                            </p>
                        </div>
                        <div className={`p-5 rounded-3xl ${isWipActive ? 'bg-indigo-500 text-white' : 'bg-slate-50 text-slate-400'}`}>
                            <TrendingUp className="w-10 h-10" />
                        </div>
                    </div>
                    {/* Tiny subcards for Urgent, Delayed, Stagnant */}
                    <div className="mt-8 grid grid-cols-3 gap-2">
                        <div onClick={(e) => { e.stopPropagation(); setSelectedType('URGENT'); }} className={`p-4 rounded-2xl border transition-all ${selectedType === 'URGENT' ? 'bg-rose-500 border-rose-500 text-white shadow-lg' : isWipActive ? 'bg-white/10 border-transparent text-white/50 hover:bg-white/20' : 'bg-rose-50 border-rose-100 text-rose-500/50 hover:bg-rose-100'}`}>
                            <p className="text-[9px] font-black uppercase mb-1">Gấp</p>
                            <p className="text-lg font-black">{urgentList.length}</p>
                        </div>
                        <div onClick={(e) => { e.stopPropagation(); setSelectedType('DELAYED'); }} className={`p-4 rounded-2xl border transition-all ${selectedType === 'DELAYED' ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : isWipActive ? 'bg-white/10 border-transparent text-white/50 hover:bg-white/20' : 'bg-purple-50 border-purple-100 text-purple-600/50 hover:bg-purple-100'}`}>
                            <p className="text-[9px] font-black uppercase mb-1">Trễ</p>
                            <p className="text-lg font-black">{delayedList.length}</p>
                        </div>
                        <div onClick={(e) => { e.stopPropagation(); setSelectedType('STAGNANT'); }} className={`p-4 rounded-2xl border transition-all ${selectedType === 'STAGNANT' ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : isWipActive ? 'bg-white/10 border-transparent text-white/50 hover:bg-white/20' : 'bg-amber-50 border-amber-100 text-amber-600/50 hover:bg-amber-100'}`}>
                            <p className="text-[9px] font-black uppercase mb-1">Tồn lâu</p>
                            <p className="text-lg font-black">{stagnantList.length}</p>
                        </div>
                    </div>
                </div>

                {/* Ready to Stock Master Card */}
                <div 
                    onClick={() => setSelectedType(selectedType === 'READY_STOCK' ? null : 'READY_STOCK')}
                    className={`cursor-pointer group relative overflow-hidden p-8 rounded-[3rem] border-4 transition-all duration-300 ${isReadyActive ? 'bg-emerald-600 border-emerald-400 shadow-2xl text-white' : 'bg-white border-slate-100 hover:border-emerald-500 shadow-lg'}`}
                >
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full ${isReadyActive ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-600'}`}>Ready to Store</span>
                            <h2 className={`text-4xl md:text-6xl font-black mt-4 tracking-tighter font-outfit ${isReadyActive ? 'text-white' : 'text-slate-900'}`}>
                                {readyStats.count} <span className="text-lg opacity-50 ml-1">đơn</span>
                            </h2>
                            <p className={`text-xl font-bold mt-1 ${isReadyActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                                {readyStats.qty.toLocaleString()} <span className="text-xs uppercase font-black opacity-60">đôi (PRS)</span>
                            </p>
                        </div>
                        <div className={`p-5 rounded-3xl ${isReadyActive ? 'bg-black/20 text-white' : 'bg-emerald-50 text-emerald-500'}`}>
                            <Package className="w-10 h-10" />
                        </div>
                    </div>
                    <div className="mt-8 grid grid-cols-3 gap-2">
                        <div onClick={(e) => { e.stopPropagation(); setSelectedType('READY_STOCK_URGENT'); }} className={`p-4 rounded-2xl border transition-all ${selectedType === 'READY_STOCK_URGENT' ? 'bg-rose-500 border-rose-500 text-white shadow-lg' : isReadyActive ? 'bg-white/10 border-transparent text-white/50 hover:bg-white/30' : 'bg-emerald-50 border-emerald-100 text-emerald-600/50 hover:bg-emerald-100'}`}>
                            <p className="text-[9px] font-black uppercase mb-1">Gấp</p>
                            <p className="text-lg font-black">{readyUrgent.length}</p>
                        </div>
                        <div onClick={(e) => { e.stopPropagation(); setSelectedType('READY_STOCK_DELAYED'); }} className={`p-4 rounded-2xl border transition-all ${selectedType === 'READY_STOCK_DELAYED' ? 'bg-purple-600 border-purple-600 text-white shadow-lg' : isReadyActive ? 'bg-white/10 border-transparent text-white/50 hover:bg-white/30' : 'bg-emerald-50 border-emerald-100 text-emerald-600/50 hover:bg-emerald-100'}`}>
                            <p className="text-[9px] font-black uppercase mb-1">Trễ</p>
                            <p className="text-lg font-black">{readyDelayed.length}</p>
                        </div>
                        <div onClick={(e) => { e.stopPropagation(); setSelectedType('READY_STOCK_STAGNANT'); }} className={`p-4 rounded-2xl border transition-all ${selectedType === 'READY_STOCK_STAGNANT' ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : isReadyActive ? 'bg-white/10 border-transparent text-white/50 hover:bg-white/30' : 'bg-emerald-50 border-emerald-100 text-emerald-600/50 hover:bg-emerald-100'}`}>
                            <p className="text-[9px] font-black uppercase mb-1">Tồn lâu</p>
                            <p className="text-lg font-black">{readyStagnant.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Side: Status Breakdown and Charts */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Detailed Breakdown Area */}
                    <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-xl border border-slate-50">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter font-outfit flex items-center gap-3 italic">
                                   <Filter className="w-6 h-6 text-indigo-500" />
                                   {selectedType === 'URGENT' ? 'Chi tiết hàng gấp' : 
                                    selectedType === 'DELAYED' ? 'Chi tiết hàng trễ' : 
                                    selectedType === 'STAGNANT' ? 'Chi tiết hàng tồn lâu' : 
                                    selectedType === 'READY_STOCK' ? 'Chi tiết đã hoàn thành' : 
                                    selectedType === 'READY_STOCK_URGENT' ? 'Chi tiết Sẵn sàng Nhập kho (Gấp)' :
                                    selectedType === 'READY_STOCK_DELAYED' ? 'Chi tiết Sẵn sàng Nhập kho (Trễ)' :
                                    selectedType === 'READY_STOCK_STAGNANT' ? 'Chi tiết Sẵn sàng Nhập kho (Tồn lâu)' :
                                    'Chi tiết WIP Công đoạn'}
                                </h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Breakdown by current status</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {STATUS_ORDER.map(status => {
                                const list = activeList.filter(o => (o.rawStatus || "").trim() === status);
                                const q = list.reduce((sum, o) => sum + (o.quantity || 0), 0);
                                const noLogoCount = list.filter(o => o.logoStatus === 'Chưa có Logo').length;
                                const hasLogoCount = list.filter(o => o.logoStatus === 'Có Logo').length;
                                if (list.length === 0) return null;
                                return (
                                    <div key={status} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:scale-[1.02] transition-all relative">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest h-8">{STATUS_MAP[status]}</p>
                                        <p className="text-2xl font-black text-slate-900 font-outfit">{list.length} <span className="text-[10px] font-bold text-slate-400 uppercase font-inter">đơn</span></p>
                                        <p className="text-[10px] font-bold text-slate-400">{q.toLocaleString()} prs</p>
                                        {(noLogoCount > 0 || hasLogoCount > 0) && (
                                            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200/60">
                                                {hasLogoCount > 0 && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{hasLogoCount} CÓ LOGO</span>}
                                                {noLogoCount > 0 && <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100">{noLogoCount} CHƯA LOGO</span>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* Allocation Card (Moved to Left Side for wider layout) */}
                    <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl border border-slate-50 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black uppercase tracking-tighter font-outfit italic">Phân bổ Chuyền</h3>
                            <Link href="/monitor">
                                <ChevronRight className="w-6 h-6 text-slate-300 hover:text-indigo-500 cursor-pointer" />
                            </Link>
                        </div>

                        {/* Mode Switch Tabs */}
                        <div className="flex gap-2 p-2 bg-slate-100 rounded-2xl mb-8">
                            <button 
                                onClick={() => setViewMode('current')}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'current' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Hiện tại (WIP)
                            </button>
                            <button 
                                onClick={() => setViewMode('planned')}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'planned' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Dự kiến (Schedule)
                            </button>
                        </div>

                        <div className="space-y-6">
                            {lineAllocation.map((stat, idx) => {
                                 const lineUrgent = stat.orderList.filter((o: any) => allPriority.some(p => p.orderId === o.id)).length;
                                 const lineDelayed = stat.orderList.filter((o: any) => o.finishDate && o.finishDate < new Date().toISOString().split('T')[0]).length;
                                 const calculateStagnant = (startTime: string | null) => {
                                     if (!startTime) return 0;
                                     const start = new Date(startTime);
                                     const diffMs = new Date().getTime() - start.getTime();
                                     return Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                 };
                                 const lineStagnant = stat.orderList.filter((o: any) => calculateStagnant(o.leanlineInDate) >= 2).length;

                                 const leanlineList = stat.orderList.filter((o: any) => (o.rawStatus||"").includes("6."));
                                 const packingList = stat.orderList.filter((o: any) => (o.rawStatus||"").includes("7."));
                                 const returnList = stat.orderList.filter((o: any) => (o.rawStatus||"").includes("7.1"));
                                 const leanlineLogoMissing = leanlineList.filter((o: any) => o.logoStatus === "Chưa có Logo").length;

                                 const moldingList = stat.orderList.filter((o: any) => (o.rawStatus||"").includes("5.WIP"));
                                 const moldingOneList = stat.orderList.filter((o: any) => (o.rawStatus||"").includes("5.1."));
                                 const moldingLogoMissing = moldingList.filter((o: any) => o.logoStatus === "Chưa có Logo").length;
                                 const moldingOneLogoMissing = moldingOneList.filter((o: any) => o.logoStatus === "Chưa có Logo").length;

                                 return (
                                     <div key={stat.name} className="flex flex-col gap-3 group border-b border-slate-100 pb-6 mb-6 last:border-0 last:mb-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-2xl md:text-3xl font-black font-outfit uppercase tracking-tighter text-slate-900 shadow-sm px-2">CHUYỀN {stat.name}</h4>
                                        </div>
                                        
                                        <div className="flex justify-between items-end flex-wrap gap-4 px-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${lineUrgent > 0 ? 'bg-rose-100/80 text-rose-600' : 'bg-rose-50/50 text-rose-300'}`}>Gấp: {lineUrgent}</span>
                                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${lineDelayed > 0 ? 'bg-purple-100/80 text-purple-600' : 'bg-purple-50/50 text-purple-300'}`}>Trễ: {lineDelayed}</span>
                                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${lineStagnant > 0 ? 'bg-amber-100/80 text-amber-600' : 'bg-amber-50/50 text-amber-300'}`}>Tồn lâu: {lineStagnant}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-base font-black text-indigo-500 tracking-widest">{stat.qty.toLocaleString()} PRS</span>
                                                <span className="text-sm font-bold text-slate-400 ml-1">/ {stat.orders} <span className="text-[10px] uppercase font-inter font-black">đơn</span></span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3 mt-4 px-2 tracking-tighter">
                                            {moldingList.length > 0 && (
                                                <div className="px-5 py-3 bg-slate-50 border border-slate-100/80 rounded-2xl flex items-center gap-3 tracking-widest shadow-sm">
                                                    <span className="text-xs font-black text-slate-400 uppercase leading-none">5. WIP MOLDING: <span className="text-slate-900 ml-1">{moldingList.length}</span></span>
                                                    {moldingLogoMissing > 0 && <span className="text-xs font-black text-rose-600 uppercase leading-none">! {moldingLogoMissing} LOGO</span>}
                                                </div>
                                            )}
                                            {moldingOneList.length > 0 && (
                                                <div className="px-5 py-3 bg-slate-50 border border-slate-100/80 rounded-2xl flex items-center gap-3 tracking-widest shadow-sm">
                                                    <span className="text-xs font-black text-slate-400 uppercase leading-none">5.1 SAU MOLDING: <span className="text-slate-900 ml-1">{moldingOneList.length}</span></span>
                                                    {moldingOneLogoMissing > 0 && <span className="text-xs font-black text-rose-600 uppercase leading-none">! {moldingOneLogoMissing} LOGO</span>}
                                                </div>
                                            )}
                                            {leanlineList.length > 0 && (
                                                <div className="px-5 py-3 bg-slate-50 border border-slate-100/80 rounded-2xl flex items-center gap-3 tracking-widest shadow-sm">
                                                    <span className="text-xs font-black text-slate-400 uppercase leading-none">6. ĐANG TRONG LEANLINE: <span className="text-slate-900 ml-1">{leanlineList.length}</span></span>
                                                    {leanlineLogoMissing > 0 && <span className="text-xs font-black text-rose-600 uppercase leading-none">! {leanlineLogoMissing} LOGO</span>}
                                                </div>
                                            )}
                                            {packingList.length > 0 && packingList.length !== returnList.length && (
                                                <div className="px-5 py-3 bg-slate-50 border border-slate-100/80 rounded-2xl flex items-center gap-3 tracking-widest shadow-sm">
                                                    <span className="text-xs font-black text-slate-400 uppercase leading-none">7. CHỜ BÙ: <span className="text-slate-900 ml-1">{packingList.length - returnList.length}</span></span>
                                                </div>
                                            )}
                                            {returnList.length > 0 && (
                                                <div className="px-5 py-3 bg-slate-50 border border-slate-100/80 rounded-2xl flex items-center gap-3 tracking-widest shadow-sm">
                                                    <span className="text-xs font-black text-slate-400 uppercase leading-none">7.1 TRẢ ĐƠN: <span className="text-slate-900 ml-1">{returnList.length}</span></span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-3.5 w-full bg-slate-50 rounded-full overflow-hidden mt-4">
                                            <div 
                                                className={`h-full transition-all duration-1000 ${idx === 0 ? 'bg-indigo-700/90' : 'bg-slate-300 group-hover:bg-indigo-400'}`}
                                                style={{ width: `${(stat.qty / (Math.max(...lineAllocation.map(l => l.qty)) || 1)) * 100}%` }}
                                            ></div>
                                        </div>
                                     </div>
                                 );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Side: Charts and Quick Actions */}
                <div className="space-y-8">
                    {/* Chart Area */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50">
                            <h4 className="text-lg font-black uppercase tracking-tighter mb-6 font-outfit flex items-center gap-2">
                                <PieChartIcon className="w-5 h-5 text-indigo-500" /> Phân theo quy trình (PRS)
                            </h4>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={chartData} 
                                            innerRadius={50} 
                                            outerRadius={80} 
                                            paddingAngle={5} 
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                            labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                                            style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }}
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50">
                            <h4 className="text-lg font-black uppercase tracking-tighter mb-6 font-outfit flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-indigo-500" /> Sản lượng theo chuyền (PRS)
                            </h4>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={lineAllocation.slice(0, 5)} margin={{ top: 20 }}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                                        <Bar dataKey="qty" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="qty" position="top" fill="#6366f1" fontSize={10} fontWeight="bold" formatter={(val: any) => val?.toLocaleString() || '0'} />
                                        </Bar>
                                        <RechartsTooltip />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                    
                    {/* Quick Links Card */}
                    <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden group">
                        <h4 className="text-xl font-black uppercase tracking-[0.2em] mb-8 font-outfit text-white/50">Hành động nhanh</h4>
                        <div className="space-y-4 relative z-10">
                            {[
                                { label: 'Xem Kế hoạch', href: '/schedule', icon: <Package className="w-5 h-5"/>, color: 'bg-white/10 hover:bg-white text-white hover:text-slate-900' },
                                { label: 'Giám sát live', href: '/monitor', icon: <TrendingUp className="w-5 h-5"/>, color: 'bg-white/10 hover:bg-white text-white hover:text-slate-900' },
                                { label: 'Set hàng gấp', href: '/config/priority', icon: <AlertCircle className="w-5 h-5"/>, color: 'bg-rose-500/30 hover:bg-rose-500 border border-rose-500/50' }
                            ].map((btn, i) => (
                                <Link key={i} href={btn.href} className={`block p-6 rounded-3xl transition-all flex justify-between items-center ${btn.color}`}>
                                    <div className="flex items-center gap-4">
                                        {btn.icon}
                                        <span className="font-black text-sm uppercase tracking-widest">{btn.label}</span>
                                    </div>
                                    <ChevronRight className="w-5 h-5" />
                                </Link>
                            ))}
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-[80px] pointer-events-none"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
