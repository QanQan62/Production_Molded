import { db } from "@/lib/db";
import { lines, lineRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import RulesClient from "./RulesClient";

export default async function RulesPage() {
  const allLinesRaw = await db.select().from(lines).where(eq(lines.isActive, true));
  const allowedLines = ['M1', 'M2', 'M3', 'M4', 'M5', 'H1', 'H2'];
  const allLines = allLinesRaw.filter(l => allowedLines.includes(l.lineCode.toUpperCase()));
  
  const currentRules = await db.select().from(lineRules);

  const rawOrders = await db.select().from(require('@/db/schema').orders);
  
  const uniqueBrands = Array.from(new Set(rawOrders.map(o => o.brand).filter(Boolean)));
  const uniqueMolds = Array.from(new Set(rawOrders.map(o => o.moldType).filter(Boolean)));
  const uniqueCustomers = Array.from(new Set(rawOrders.map(o => o.articleCode).filter(Boolean)));
  
  const fieldOptions = {
      'BRAND': uniqueBrands,
      'MOLD': uniqueMolds,
      'ARTICLE': uniqueCustomers
  };

  return (
    <div className="p-8 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Cấu hình Chuyền</h1>
        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs italic">Thiết lập Quy tắc ưu tiên theo đặc tính để tự động phân phối đơn vào chuyền phù hợp</p>
      </header>

      <RulesClient lines={allLines} initialRules={currentRules} fieldOptions={fieldOptions} />
    </div>
  );
}
