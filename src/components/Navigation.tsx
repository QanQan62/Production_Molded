"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { name: "Kế hoạch ngày mai", href: "/schedule", icon: "🗓️" },
    { name: "Giám sát xưởng", href: "/monitor", icon: "🏭" },
    { name: "Cấu hình Chuyền", href: "/config/rules", icon: "⚙️" },
    { name: "Đơn hàng Gấp", href: "/config/priority", icon: "🚀" },
  ];

  return (
    <nav className="bg-slate-900 text-white border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-2xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-tighter">OVN_PPC</span>
            <div className="hidden md:flex items-center space-x-1">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                      isActive 
                        ? "bg-white text-slate-900 shadow-xl shadow-white/10" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="mr-2">{link.icon}</span>
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Online</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
