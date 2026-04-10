"use client";

import React, { useState } from "react";
import Link from "next/link";

const STATUS_MAP: Record<string, string> = {
  '5.WIP IN MOLDING': '5. Đang thành hình',
  '5.1.WIP SAU MOLDING': '5.1 Đã thành hình',
  '6.WIP IN LEAN LINE': '6. Đang trong Leanline',
  '7.PACKING': '7. Chờ bù',
  '7.1 RETURN LINE': '7.1 Trả đơn',
  '8.KHO TẠM': '8. Sẵn sàng nhập kho'
};

const STATUS_ORDER = [
  '5.WIP IN MOLDING',
  '5.1.WIP SAU MOLDING',
  '6.WIP IN LEAN LINE',
  '7.PACKING',
  '7.1 RETURN LINE',
  '8.KHO TẠM'
];

export default function DashboardClient({ allOrders, allLines, allPriority }: { allOrders: any[], allLines: any[], allPriority: any[] }) {
    const [selectedType, setSelectedType] = useState<string | null>(null);

    const urgentList = allOrders.filter(o => 
        allPriority.some(p => p.orderId === o.id) || 
        o.finishDate === new Date().toISOString().split('T')[0]
    );

    const delayedList = allOrders.filter(o => 
        o.finishDate && o.finishDate < new Date().toISOString().split('T')[0]
    );

    const calculateDuration = (startTime: string | null) => {
        if (!startTime) return 0;
        const start = new Date(startTime);
        const diffMs = new Date().getTime() - start.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    };

    const stagnantList = allOrders.filter(o => 
        o.logoStatus === "Chưa có Logo" || calculateDuration(o.leanlineInDate) >= 2
    );

    const readyToStockList = allOrders.filter(o => (o.rawStatus || "").split('.')[0] === "8" || (o.rawStatus || "").includes("KHO TẠM"));

    const getListByType = (type: string) => {
        if (type === 'URGENT') return urgentList;
        if (type === 'DELAYED') return delayedList;
        if (type === 'STAGNANT') return stagnantList;
        if (type === 'READY_STOCK') return readyToStockList;
        return allOrders;
    };

    const activeList = selectedType ? getListByType(selectedType) : allOrders;

    const statusStats = STATUS_ORDER.map(status => {
        const list = activeList.filter(o => (o.rawStatus || "").trim() === status);
        const hasLogo = list.filter(o => o.logoStatus === 'Có Logo').length;
        const noLogo = list.filter(o => o.logoStatus === 'Chưa có Logo').length;
        const otherLogo = list.length - hasLogo - noLogo;
        return {
            status,
            label: STATUS_MAP[status],
            count: list.length,
            hasLogo,
            noLogo,
            otherLogo
        };
    });

    const totalQty = allOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

    const lineStats = allLines.map(line => {
        const lineOrders = allOrders.filter(o => o.sourceLine?.toUpperCase() === line.lineCode.toUpperCase());
        const u = lineOrders.filter(o => urgentList.some(ul => ul.id === o.id)).length;
        const d = lineOrders.filter(o => delayedList.some(dl => dl.id === o.id)).length;
        const s = lineOrders.filter(o => stagnantList.some(sl => sl.id === o.id)).length;
        
        const qty = lineOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

        const breakDown = STATUS_ORDER.map(st => ({
            label: STATUS_MAP[st],
            count: lineOrders.filter(o => (o.rawStatus || "").trim() === st).length,
            noLogo: lineOrders.filter(o => (o.rawStatus || "").trim() === st && o.logoStatus === 'Chưa có Logo').length
        })).filter(b => b.count > 0);

        return { ...line, count: lineOrders.length, qty, urgentCount: u, delayedCount: d, stagnantCount: s, breakDown };
    });

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8" style={{ fontFamily: 'Arial, sans-serif' }}>
            <header className="flex justify-between items-end mb-4">
                <div>
                   <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase italic">Thống kê Sản xuất</h1>
                   <p className="text-slate-500 font-bold mt-2 uppercase tracking-[0.5em] text-[8px] md:text-[10px] bg-slate-200 inline-block px-3 py-1 rounded-full italic">Production Overview</p>
                </div>
            </header>

            {/* Thông báo nhập kho riêng biệt */}
            <div 
                onClick={() => setSelectedType(selectedType === 'READY_STOCK' ? null : 'READY_STOCK')}
                className={`cursor-pointer relative overflow-hidden group transition-all duration-500 rounded-[2.5rem] border-4 p-8 md:p-12 ${
                    selectedType === 'READY_STOCK' 
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-2xl shadow-emerald-200' 
                    : 'bg-white border-slate-100 hover:border-emerald-500 shadow-xl'
                }`}
            >
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1 rounded-full ${selectedType === 'READY_STOCK' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-600'}`}>
                            Thông báo Quan trọng
                        </span>
                        <h2 className={`text-3xl md:text-5xl font-black mt-4 tracking-tighter ${selectedType === 'READY_STOCK' ? 'text-white' : 'text-slate-900'}`}>
                            HIỆN CÓ <span className="underline decoration-wavy underline-offset-8 decoration-emerald-400">{readyToStockList.length}</span> ĐƠN HÀNG SẴN SÀNG NHẬP KHO
                        </h2>
                        <p className={`mt-2 font-bold italic ${selectedType === 'READY_STOCK' ? 'text-emerald-100' : 'text-slate-400'}`}>
                            Các đơn hàng này đã hoàn thành công đoạn chờ và có thể đưa vào kho thành phẩm ngay lập tức.
                        </p>
                    </div>
                    <div className={`text-6xl md:text-8xl font-black opacity-20 group-hover:opacity-40 transition-all ${selectedType === 'READY_STOCK' ? 'scale-110' : ''}`}>
                        📦
                    </div>
                </div>
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/5 rounded-full -ml-20 -mb-20 blur-3xl"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div 
                    onClick={() => setSelectedType(null)}
                    className={`cursor-pointer p-6 md:p-8 rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col justify-between group ${!selectedType ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-100 hover:border-slate-900'}`}
                >
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${!selectedType ? 'text-slate-400' : 'text-slate-400 group-hover:text-slate-500'}`}>Tổng WIP</p>
                    <p className={`text-4xl md:text-5xl font-black tracking-tighter ${!selectedType ? 'text-white' : 'text-slate-900'}`}>{allOrders.length}</p>
                    <div className="mt-4 h-1 w-12 bg-indigo-500 rounded-full"></div>
                </div>

                <div 
                    onClick={() => setSelectedType('URGENT')}
                    className={`cursor-pointer p-6 md:p-8 rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col justify-between group ${selectedType === 'URGENT' ? 'bg-rose-600 border-rose-600' : 'bg-white border-slate-100 hover:border-rose-500'}`}
                >
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${selectedType === 'URGENT' ? 'text-rose-200' : 'text-slate-400'}`}>Hàng Gấp</p>
                    <p className={`text-4xl md:text-5xl font-black tracking-tighter ${selectedType === 'URGENT' ? 'text-white' : 'text-slate-900'}`}>{urgentList.length}</p>
                    <div className="mt-4 h-1 w-12 bg-rose-400 rounded-full"></div>
                </div>

                <div 
                    onClick={() => setSelectedType('DELAYED')}
                    className={`cursor-pointer p-6 md:p-8 rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col justify-between group ${selectedType === 'DELAYED' ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-100 hover:border-purple-500'}`}
                >
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${selectedType === 'DELAYED' ? 'text-purple-200' : 'text-slate-400'}`}>Hàng Trễ</p>
                    <p className={`text-4xl md:text-5xl font-black tracking-tighter ${selectedType === 'DELAYED' ? 'text-white' : 'text-slate-900'}`}>{delayedList.length}</p>
                    <div className="mt-4 h-1 w-12 bg-purple-400 rounded-full"></div>
                </div>

                <div 
                    onClick={() => setSelectedType('STAGNANT')}
                    className={`cursor-pointer p-6 md:p-8 rounded-[2.5rem] shadow-xl border transition-all duration-500 flex flex-col justify-between group ${selectedType === 'STAGNANT' ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-100 hover:border-amber-500'}`}
                >
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${selectedType === 'STAGNANT' ? 'text-white' : 'text-slate-400'}`}>Hàng Tồn Lâu</p>
                    <p className={`text-4xl md:text-5xl font-black tracking-tighter ${selectedType === 'STAGNANT' ? 'text-white' : 'text-slate-900'}`}>{stagnantList.length}</p>
                    <div className="mt-4 h-1 w-12 bg-amber-200 rounded-full"></div>
                </div>
            </div>

            <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl border border-slate-100 italic">
                <div className="flex justify-between items-center mb-12">
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter bg-slate-900 text-white inline-block px-6 py-3 rounded-full">
                        {selectedType === 'URGENT' ? '⚡ Chi tiết Hàng Gấp' : 
                        selectedType === 'DELAYED' ? '⏰ Chi tiết Hàng Trễ' : 
                        selectedType === 'STAGNANT' ? '⏳ Chi tiết Hàng Tồn Lâu' : 
                        selectedType === 'READY_STOCK' ? '📦 Chi tiết Sẵn sàng nhập kho' : '📦 Chi tiết WIP'}
                    </h2>
                    <div className="hidden md:flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-black uppercase">Có Logo</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                            <span className="text-[10px] font-black uppercase">Chưa Logo</span>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {statusStats.map(stat => (
                        <div key={stat.status} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 hover:shadow-lg transition-all group">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 h-8">{stat.label}</p>
                            <p className="text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{stat.count}</p>
                            <div className="mt-4 space-y-1">
                                <div className="flex justify-between text-[8px] font-bold uppercase">
                                    <span className="text-emerald-500">Logo OK:</span>
                                    <span>{stat.hasLogo}</span>
                                </div>
                                <div className="flex justify-between text-[8px] font-bold uppercase">
                                    <span className="text-rose-500">Chưa Logo:</span>
                                    <span>{stat.noLogo}</span>
                                </div>
                                <div className="flex justify-between text-[8px] font-bold uppercase text-slate-400 border-t border-slate-200 pt-1 mt-1">
                                    <span>Tổng số:</span>
                                    <span>{stat.count}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl border border-slate-100">
                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-8 italic">Phân bổ theo Chuyền</h2>
                    <div className="space-y-8">
                        {lineStats.map(stat => (
                            <div key={stat.id} className="group border-b border-slate-50 pb-6 last:border-0">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-2">
                                    <div>
                                        <span className="text-lg font-black uppercase tracking-widest text-slate-900">Chuyền {stat.lineCode}</span>
                                        <div className="flex gap-3 mt-1">
                                            <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-100 text-rose-600 rounded-md">Gấp: {stat.urgentCount}</span>
                                            <span className="text-[9px] font-bold px-2 py-0.5 bg-purple-100 text-purple-600 rounded-md">Trễ: {stat.delayedCount}</span>
                                            <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-100 text-amber-600 rounded-md">Tồn Lâu: {stat.stagnantCount}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400">{stat.qty.toLocaleString()} PRS / {stat.count} đơn</span>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {stat.breakDown.map((b: any, bi: number) => (
                                        <div key={bi} className="bg-slate-50 px-3 py-2 rounded-xl text-[8px] font-bold uppercase border border-slate-100 flex items-center gap-2">
                                            <span className="text-slate-400">{b.label}:</span>
                                            <span className="text-slate-900">{b.count}</span>
                                            {b.noLogo > 0 && <span className="text-rose-500 font-black animate-pulse">! {b.noLogo} Logo</span>}
                                        </div>
                                    ))}
                                </div>

                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-slate-900 group-hover:bg-indigo-600 transition-all duration-700 ease-out rounded-full" 
                                        style={{ width: `${(stat.qty / totalQty) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900 p-8 md:p-10 rounded-[3rem] shadow-2xl text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 italic">Hành động nhanh</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-10 italic">Quick Links</p>
                        
                        <div className="space-y-4">
                            <Link href="/schedule" className="block p-5 bg-white/5 hover:bg-white rounded-3xl transition-all group">
                                <div className="flex justify-between items-center text-white group-hover:text-slate-900">
                                    <span className="font-black text-sm uppercase tracking-widest">Xem Kế hoạch</span>
                                    <span>&rarr;</span>
                                </div>
                            </Link>
                            <Link href="/monitor" className="block p-5 bg-white/5 hover:bg-white rounded-3xl transition-all group">
                                <div className="flex justify-between items-center text-white group-hover:text-slate-900">
                                    <span className="font-black text-sm uppercase tracking-widest">Giám sát live</span>
                                    <span>&rarr;</span>
                                </div>
                            </Link>
                            <Link href="/config/priority" className="block p-5 bg-rose-500/20 hover:bg-rose-500 rounded-3xl transition-all group border border-rose-500/30">
                                <div className="flex justify-between items-center text-white">
                                    <span className="font-black text-sm uppercase tracking-widest">Set hàng gấp</span>
                                    <span>⚡</span>
                                </div>
                            </Link>
                        </div>
                    </div>

                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]"></div>
                </div>
            </div>
        </div>
    );
}
