import Link from "next/link";

export default function HomePage() {
  const menuItems = [
    { title: "Bảng Thống Kê", href: "/dashboard", description: "Tổng quan trạng thái đơn hàng (Urgent, Delayed, Stagnant, Stock).", icon: "📊", color: "bg-indigo-900" },
    { title: "Kế Hoạch Khớp Chuyền", href: "/schedule", description: "Xem tổng thể queue của từng chuyền và điều lệnh ưu tiên.", icon: "🗓️", color: "bg-blue-600" },
    { title: "Giám Sát Sản Xuất", href: "/monitor", description: "Theo dõi các đơn đang chạy tại xưởng real-time.", icon: "🏭", color: "bg-emerald-600" },
    { title: "Cấu Hình Rules Chuyền", href: "/config/rules", description: "Thiết lập quy tắc chọn chuyền tự động theo thuộc tính đơn.", icon: "⚙️", color: "bg-slate-800" },
    { title: "Đơn Hàng Gấp", href: "/config/priority", description: "Ghi đè hạn hoàn thành và gán độ ưu tiên cao.", icon: "🚀", color: "bg-rose-600" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-5xl w-full">
         <header className="text-center mb-16">
            <h1 className="text-6xl font-serif text-slate-900 tracking-tighter mb-4">Hệ Thống Lập Kế Hoạch Tự Động</h1>
            <p className="text-xl text-slate-500 italic">"Gán chuyền chính xác, vận hành hiệu quả"</p>
         </header>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {menuItems.map((item) => (
               <Link 
                 key={item.href} 
                 href={item.href}
                 className="group relative bg-white rounded-[3rem] p-10 shadow-2xl hover:shadow-indigo-200 transition-all border-2 border-white hover:border-indigo-100 flex flex-col items-start gap-6"
               >
                  <div className={`${item.color} text-4xl p-6 rounded-3xl shadow-lg transition-transform group-hover:scale-110`}>
                    {item.icon}
                  </div>
                  <div>
                    <h2 className="text-3xl font-serif text-slate-900 group-hover:text-indigo-600 transition-colors uppercase font-bold tracking-tight">{item.title}</h2>
                    <p className="text-slate-500 mt-2 text-lg leading-relaxed">{item.description}</p>
                  </div>
                  <div className="mt-4 flex items-center text-indigo-600 font-bold uppercase tracking-widest text-xs gap-2">
                     Truy cập ngay
                     <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>
               </Link>
            ))}
         </div>

         <footer className="mt-20 text-center text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">
             PPC Automation System v2.0 • 2026
         </footer>
      </div>
    </div>
  );
}
