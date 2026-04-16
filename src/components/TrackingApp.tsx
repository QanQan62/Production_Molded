'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Search, 
  Settings, 
  Truck, 
  MapPin, 
  Plus, 
  X, 
  History, 
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { processOrders, updateCartPosition, lookupOrder } from '@/lib/trackingActions';
import { TRAM } from '@/lib/constants';

declare global {
  interface Window {
    Html5Qrcode: any;
  }
}

export default function TrackingApp() {
  const [screen, setScreen] = useState<'setup' | 'work' | 'search'>('setup');
  const [station, setStation] = useState('');
  const [msnv, setMsnv] = useState('');
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [scanMode, setScanMode] = useState<'WORK_ORDER' | 'WORK_LOCATION' | 'MAP_CART_TO_LOC'>('WORK_ORDER');
  const [locationType, setLocationType] = useState<'NORMAL' | 'CART'>('NORMAL');
  const [vitri, setVitri] = useState('');
  const [loaiHang, setLoaiHang] = useState('Hàng Khuôn');
  const [ghiChu, setGhiChu] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Cart mapping state
  const [tempCartID, setTempCartID] = useState('');
  const [tempLocID, setTempLocID] = useState('');
  const [isScanningCart, setIsScanningCart] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);

  const scannerRef = useRef<any>(null);
  const audioOkRef = useRef<HTMLAudioElement | null>(null);
  const audioNgRef = useRef<HTMLAudioElement | null>(null);
  
  // Cooldown & De-dupe refs
  const lastScannedCode = useRef<string>('');
  const lastScannedTime = useRef<number>(0);
  
  // Refs
  const scanModeRef = useRef(scanMode);
  scanModeRef.current = scanMode;
  const locationTypeRef = useRef(locationType);
  locationTypeRef.current = locationType;
  const isScanningCartRef = useRef(isScanningCart);
  isScanningCartRef.current = isScanningCart;
  const tempCartIDRef = useRef(tempCartID);
  tempCartIDRef.current = tempCartID;
  const stationRef = useRef(station);
  stationRef.current = station;
  const scannedCodesRef = useRef(scannedCodes);
  scannedCodesRef.current = scannedCodes;

  useEffect(() => {
    const savedTram = localStorage.getItem('track_tram');
    const savedMsnv = localStorage.getItem('track_msnv');
    if (savedTram) setStation(savedTram);
    if (savedMsnv) setMsnv(savedMsnv);
    
    if (!window.Html5Qrcode) {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode";
        script.async = true;
        document.body.appendChild(script);
    }
  }, []);

  const playSound = (type: 'ok' | 'ng') => {
    if (type === 'ok' && audioOkRef.current) audioOkRef.current.play().catch(() => {});
    if (type === 'ng' && audioNgRef.current) audioNgRef.current.play().catch(() => {});
  };

  const stopCamera = async () => {
    if (scannerRef.current && isCameraOn) {
      try {
        await scannerRef.current.stop();
        setIsCameraOn(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const startCamera = async () => {
    if (!window.Html5Qrcode) return;
    
    setIsCameraOn(true);
    const html5QrCode = new window.Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: 250 },
        (decodedText: string) => {
          handleScan(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error(err);
      setIsCameraOn(false);
    }
  };

  const formatOrderCode = (raw: string) => {
    let code = raw.trim().toUpperCase().split('^')[0];
    if (/^XE\d+$/.test(code)) return `XE - ${code.slice(2)}`;
    if (/^XE - \d+$/.test(code)) return code;
    if (/^\d{10}$/.test(code)) return `RPRO-${code.slice(0, 6)}-${code.slice(6, 10)}`;
    if (/^\d{6}-\d{4}$/.test(code)) return `RPRO-${code}`;
    if (/^RPRO\d{10}$/.test(code)) return `RPRO-${code.slice(4, 10)}-${code.slice(10, 14)}`;
    if (/^RPRO-\d{10}$/.test(code)) return `RPRO-${code.slice(5, 11)}-${code.slice(11, 15)}`;
    if (/^RPRO\d{6}-\d{4}$/.test(code)) return `RPRO-${code.slice(4)}`;
    return code;
  };

  const isValidCode = (code: string) => {
    return /^RPRO-\d{6}-\d{4}$/.test(code) || /^XE - \d+$/.test(code);
  };

  const handleScan = (decodedText: string) => {
    const now = Date.now();
    const rawText = decodedText.trim().toUpperCase();
    const cleanText = rawText.split('^')[0];

    if (cleanText === lastScannedCode.current && (now - lastScannedTime.current < 2000)) return;
    
    lastScannedCode.current = cleanText;
    lastScannedTime.current = now;

    if (scanModeRef.current === 'MAP_CART_TO_LOC') {
      const formatted = formatOrderCode(cleanText);
      if (isScanningCartRef.current) {
        if (/^XE - \d+$/.test(formatted)) {
          playSound('ok');
          setTempCartID(formatted);
          setIsScanningCart(false);
          lastScannedCode.current = ''; 
        } else {
          playSound('ng');
        }
      } else {
        if (formatted !== tempCartIDRef.current) {
          playSound('ok');
          setTempLocID(formatted);
          stopCamera();
        }
      }
    } else if (scanModeRef.current === 'WORK_LOCATION') {
      const formatted = formatOrderCode(cleanText);
      if (locationTypeRef.current === 'CART') {
        if (/^XE - \d+$/.test(formatted)) {
          playSound('ok');
          setVitri(formatted);
        } else {
          playSound('ng');
        }
      } else {
        playSound('ok');
        setVitri(formatted);
      }
    } else if (scanModeRef.current === 'WORK_ORDER') {
      const rawCodes = rawText.split('|');
      const processedCodes = rawCodes
        .map(c => formatOrderCode(c))
        .filter(c => isValidCode(c) && !scannedCodesRef.current.includes(c));
        
      if (processedCodes.length > 0) {
        playSound('ok');
        setScannedCodes(prev => [...processedCodes, ...prev]);
      }
    }
  };

  const vaoLamViec = () => {
    if (!/^\d{5}$/.test(msnv)) {
      alert("MSNV phải là 5 số!");
      return;
    }
    localStorage.setItem('track_tram', station);
    localStorage.setItem('track_msnv', msnv);
    setScreen('work');
  };

  const addManualOrder = () => {
    if (!manualInput) return;
    const rawCodes = manualInput.split('|');
    const processedCodes = rawCodes
      .map(c => formatOrderCode(c))
      .filter(c => c && !scannedCodes.includes(c));
    
    if (processedCodes.length > 0) {
      setScannedCodes(prev => [...processedCodes, ...prev]);
      setManualInput('');
      playSound('ok');
    }
  };

  const handleBatchUpdate = async () => {
    setLoading(true);
    if (scanMode === 'MAP_CART_TO_LOC') {
      const res = await updateCartPosition(tempCartID, tempLocID, msnv);
      alert(res.message);
      if (res.success) {
        setScanMode('WORK_ORDER');
        setTempCartID('');
        setTempLocID('');
        setIsScanningCart(true);
      }
    } else {
      const res = await processOrders(scannedCodes, station, msnv, vitri, loaiHang, ghiChu);
      alert(`Đã xử lý ${res.length} đơn hàng.`);
      setScannedCodes([]);
      setVitri('');
      setGhiChu('');
      setScanMode('WORK_ORDER');
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    const rawCodes = searchQuery.split('|');
    const codeToSearch = formatOrderCode(rawCodes[0]);
    setSearchQuery(codeToSearch);
    const result = await lookupOrder(codeToSearch);
    setSearchResult(result);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <audio ref={audioOkRef} src="https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.m4a" />
      <audio ref={audioNgRef} src="https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.m4a" />

      <header className="bg-blue-700 text-white p-4 shadow-lg sticky top-0 z-50 flex justify-between items-center">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6" /> TRACKING PRO
        </h1>
        <div className="flex gap-1">
           <button onClick={() => { stopCamera(); setScreen('search'); }} className="px-3 py-1.5 hover:bg-blue-600 rounded-lg text-sm font-medium"><Search className="w-4 h-4" /> Tra cứu</button>
           {screen !== 'setup' ? (
             <button onClick={() => { stopCamera(); setScreen('setup'); }} className="px-3 py-1.5 hover:bg-blue-600 rounded-lg text-sm font-medium"><Settings className="w-4 h-4" /> Cài đặt</button>
           ) : (
             station && msnv && <button onClick={() => setScreen('work')} className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 rounded-lg text-sm font-medium"><ArrowRight className="w-4 h-4 rotate-180" /> Quay lại</button>
           )}
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {loading && (
          <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-[100] text-white">
            <Loader2 className="w-10 h-10 animate-spin mb-2" />
            <span className="font-semibold">Đang xử lý...</span>
          </div>
        )}

        {screen === 'setup' && (
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Thiết lập Ca làm việc</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Chọn Trạm</label>
                <select className="w-full p-3 rounded-xl border border-slate-200" value={station} onChange={(e) => setStation(e.target.value)}>
                  <option value="">-- Chọn trạm --</option>
                  {Object.values(TRAM).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">MSNV (5 số)</label>
                <input type="number" className="w-full p-3 rounded-xl border border-slate-200" value={msnv} onChange={(e) => setMsnv(e.target.value)} />
              </div>
              <button onClick={vaoLamViec} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">BẮT ĐẦU NGAY <ArrowRight className="w-5 h-5" /></button>
            </div>
          </div>
        )}

        {screen === 'work' && (
          <div className="space-y-4 text-slate-900">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between text-sm">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /><b>{station}</b></div>
              <div>NV: <b>{msnv}</b></div>
            </div>

            {station.includes("Trạm 4") && (
              <button onClick={() => { setScanMode('MAP_CART_TO_LOC'); setTempCartID(''); setTempLocID(''); setIsScanningCart(true); }} className="w-full bg-slate-800 text-white p-4 rounded-xl flex flex-col items-center gap-1 shadow-md">
                <Truck className="w-6 h-6" /><span className="font-bold uppercase text-xs">Phân xe vào kệ (Leanline)</span>
              </button>
            )}

            <div className={`py-2 px-4 rounded-full text-center text-[10px] font-black shadow-inner uppercase tracking-widest ${scanMode === 'WORK_ORDER' ? 'bg-blue-100 text-blue-700' : scanMode === 'MAP_CART_TO_LOC' ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-700'}`}>
              {scanMode === 'WORK_ORDER' ? 'Bước 1: Quét mã QR đơn hàng' : scanMode === 'MAP_CART_TO_LOC' ? 'Gán mã Xe ➔ Vị trí Kệ' : 'Bước 2: Quét vị trí 📍'}
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-black aspect-square border-4 border-blue-200">
               <div id="reader" className="w-full"></div>
            </div>

            <button onClick={() => isCameraOn ? stopCamera() : startCamera()} className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${isCameraOn ? 'bg-red-100 text-red-600' : 'bg-blue-600 text-white'}`}>
              {isCameraOn ? <><CameraOff className="w-5 h-5" /> TẮT CAMERA</> : <><Camera className="w-5 h-5" /> BẬT CAMERA</>}
            </button>

            {scanMode === 'WORK_ORDER' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="text" className="flex-1 p-3 rounded-xl border border-slate-200" placeholder="Mã đơn..." value={manualInput} onChange={(e) => setManualInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addManualOrder()} />
                  <button onClick={addManualOrder} className="bg-slate-200 p-3 rounded-xl"><Plus /></button>
                </div>
                <div className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
                  <div className="bg-slate-50 p-2 text-[10px] font-black text-slate-400 border-bottom flex justify-between uppercase"><span>Đã quét ({scannedCodes.length})</span><button onClick={() => setScannedCodes([])} className="text-red-500">Xóa</button></div>
                  <ul className="max-h-40 overflow-y-auto divide-y divide-slate-50 font-bold">
                    {scannedCodes.length === 0 && <li className="p-4 text-center text-slate-300 text-sm italic">Chưa có mã nào</li>}
                    {scannedCodes.map((code, idx) => (
                      <li key={idx} className="p-3 flex justify-between items-center text-xs">{code}<button onClick={() => setScannedCodes(prev => prev.filter((_, i) => i !== idx))}><X className="w-4 h-4 text-slate-300" /></button></li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <button disabled={scannedCodes.length === 0} onClick={() => { setScanMode('WORK_LOCATION'); setLocationType('NORMAL'); }} className="bg-indigo-600 text-white py-4 rounded-xl font-black text-xs uppercase shadow-lg shadow-indigo-200 disabled:opacity-50">Cập nhật Vị trí</button>
                   <button disabled={scannedCodes.length === 0} onClick={() => { setScanMode('WORK_LOCATION'); setLocationType('CART'); }} className="bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase shadow-lg shadow-slate-200 disabled:opacity-50">Đóng lên Xe 🚚</button>
                </div>
              </div>
            )}

            {(scanMode === 'WORK_LOCATION' || scanMode === 'MAP_CART_TO_LOC') && (
              <div className="space-y-4 animate-in slide-in-from-right">
                {scanMode === 'MAP_CART_TO_LOC' ? (
                  <div className="bg-white p-4 rounded-2xl shadow-inner border-2 border-slate-800 space-y-3">
                    <div className={`p-4 rounded-xl text-center font-bold ${tempCartID ? 'bg-slate-100 text-slate-400' : 'bg-amber-400 text-black'}`}>{tempCartID ? `🚚 XE: ${tempCartID}` : '1. QUÉT MÃ XE 🚚'}</div>
                    <div className={`p-4 rounded-xl text-center font-bold ${tempLocID ? 'bg-slate-100 text-slate-400' : !tempCartID ? 'bg-slate-100 text-slate-300' : 'bg-green-500 text-white'}`}>{tempLocID ? `📍 KỆ: ${tempLocID}` : '2. QUÉT MÃ KỆ 📍'}</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-center font-bold text-xs">Quét mã QR Vị trí hoặc Kệ</div>
                    <div className="flex gap-2"><input className="flex-1 p-4 rounded-xl border-2 border-indigo-600 font-black text-center text-xl bg-white" value={vitri} readOnly placeholder="CHỜ QUÉT..." /><button onClick={() => setVitri(prompt("Vị trí:") || "")} className="bg-slate-100 px-4 rounded-xl font-bold text-xs uppercase">TAY</button></div>
                    <input className="w-full p-4 rounded-xl border border-slate-200" placeholder="Ghi chú thêm..." value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setScanMode('WORK_ORDER')} className="flex-1 bg-slate-200 py-4 rounded-xl font-bold text-xs uppercase">Quay lại</button>
                  <button disabled={scanMode === 'MAP_CART_TO_LOC' ? (!tempCartID || !tempLocID) : !vitri} onClick={handleBatchUpdate} className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-black text-xs uppercase shadow-xl shadow-emerald-100">Xác nhận cập nhật</button>
                </div>
              </div>
            )}
          </div>
        )}

        {screen === 'search' && (
          <div className="space-y-6">
             <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100">
               <h2 className="text-center font-black text-xs text-slate-400 mb-4 uppercase tracking-[0.2em]">Tra cứu tiến độ</h2>
               <div className="flex gap-2 mb-4">
                 <input className="flex-1 p-4 rounded-xl border-2 border-blue-500 font-bold" placeholder="Nhập mã đơn..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                 <button onClick={handleSearch} className="bg-blue-600 text-white px-6 rounded-xl"><Search /></button>
               </div>

               {searchResult ? (
                 <div className="space-y-4">
                   <div className="p-5 rounded-2xl border-2 border-blue-500 bg-blue-50/50 relative overflow-hidden">
                     <span className="absolute top-3 right-3 text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Hiện tại</span>
                     <h3 className="text-2xl font-black text-blue-950 mb-3">{searchResult.info.orderCode}</h3>
                     <div className="space-y-2">
                       <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-600" /><span className="font-black text-slate-700 text-sm uppercase">{searchResult.info.tram}</span></div>
                       <div className="flex items-center gap-2"><History className="w-4 h-4 text-blue-600" /><span className="text-xs font-bold text-slate-500">{searchResult.info.tg}</span></div>
                       <div className="mt-4 p-4 bg-white rounded-xl border border-blue-100 shadow-sm"><span className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-widest text-center">Vị trí hiện tại</span><span className="text-lg font-black text-red-600 block text-center uppercase italic">📍 {searchResult.info.vitri}</span></div>
                     </div>
                   </div>

                   {searchResult.missing.length > 0 && (
                     <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl"><span className="text-[9px] font-black text-amber-600 block mb-2 uppercase tracking-widest">Các trạm còn thiếu:</span><div className="flex flex-wrap gap-1">{searchResult.missing.map((s: string) => <span key={s} className="bg-amber-200/50 text-amber-800 text-[9px] px-2 py-1 rounded-lg font-black uppercase">{s}</span>)}</div></div>
                   )}

                   <div className="space-y-2">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">Lịch sử di chuyển</span>
                     {searchResult.logs.map((log: any, i: number) => (
                       <div key={i} className="flex gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                         <div className="flex flex-col items-center"><div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />{i < searchResult.logs.length - 1 && <div className="w-px h-full bg-slate-100 mt-1" />}</div>
                         <div className="flex-1"><div className="flex justify-between items-start mb-1"><span className="text-xs font-black text-slate-700 uppercase tracking-tight">{log.den}</span><span className="text-[9px] font-bold text-slate-400">{log.tg}</span></div><p className="text-[10px] text-slate-500 font-medium leading-relaxed">{log.vitri}</p></div>
                       </div>
                     ))}
                   </div>
                 </div>
               ) : searchQuery && !loading ? (
                 <div className="text-center py-10 text-slate-400 italic text-sm">Không tìm thấy dữ liệu đơn hàng</div>
               ) : null}
             </div>
             <button onClick={() => { setScreen(station ? 'work' : 'setup'); setSearchResult(null); }} className="w-full bg-slate-200 py-4 rounded-xl font-bold uppercase text-xs">Quay lại</button>
          </div>
        )}
      </main>
    </div>
  );
}
