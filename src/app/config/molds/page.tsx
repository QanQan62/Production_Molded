import { db } from "@/lib/db";
import { moldTargets, moldTypes } from "@/db/schema";
import MoldsClient from "./MoldsClient";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function MoldsConfigPage() {
  const initialTargets = await db.select().from(moldTargets);
  // We can fetch the first batch of mold mapping here
  const initialMappings = await db.select().from(moldTypes).limit(100);

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <header className="max-w-7xl mx-auto mb-12">
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">Cấu hình Khuôn</h1>
        <p className="text-slate-500 font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">
          Target Sản lượng & Phân loại Khuôn
        </p>
      </header>
      <MoldsClient initialTargets={initialTargets} initialMappings={initialMappings} />
    </div>
  );
}
