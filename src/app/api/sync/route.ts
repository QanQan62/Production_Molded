import { NextResponse } from "next/server";
import { dbShared } from "@/lib/dbShared";
import { db } from "@/lib/db";
import { orders, moldTypes, priorityOrders as priorityOrdersSchema } from "@/db/schema";
import { excelToDate } from "@/lib/excelDate";
import { sql } from "drizzle-orm";

export async function syncAllData() {
    // 1. Chạy raw query trực tiếp trên client để tránh lỗi Drizzle sql template với table name OVN_DATA
    const rawQuery = `SELECT "PRO ORDER", "Brand", "ArticleCode", "QtyOrder", "MOLD_IN(PRO)", "MOLD_OUT(PRO)", "Finish Date(PPC)", "BOM", "#MOLDTYPE", "Status", "LINE CODE", "LEAN_IN(PRO)", "#LAST", "Recieved Logo", "CODE LOGO1", "THĂNG HOA", "Description PU1", "Description FB"
                      FROM "OVN_DATA" 
                      WHERE "Status" IN ('5.WIP IN MOLDING', '5.1.WIP SAU MOLDING', '6.WIP IN LEAN LINE', '7.PACKING', '7.1 RETURN LINE', '8.KHO TẠM')`;
    
    // @ts-ignore
    const res = await dbShared.session.client.execute(rawQuery);
    const rows = res.rows;
    
    if (!rows || rows.length === 0) {
      return { count: 0, message: "Không có dữ liệu hợp lệ" };
    }

    // Lấy mapping ProductType
    const moldTypesData = await db.select().from(moldTypes);
    const moldTypeMap = new Map(moldTypesData.map(m => [m.mold, m.type]));

    // 2. Chuyển đổi dữ liệu cho bảng orders
    const insertData = rows.map((row: any) => {
      const moldInValue = Number(row["MOLD_IN(PRO)"]);
      const moldInStr = !isNaN(moldInValue) ? excelToDate(moldInValue) : null;
      
      const moldOutValue = Number(row["MOLD_OUT(PRO)"]);
      const moldOutStr = !isNaN(moldOutValue) ? excelToDate(moldOutValue) : null;

      const finishValue = Number(row["Finish Date(PPC)"]);
      const finishStr = (finishValue && !isNaN(finishValue)) ? excelToDate(finishValue) : null;

      const leanInValue = Number(row["LEAN_IN(PRO)"]);
      const leanInStr = (leanInValue && !isNaN(leanInValue)) ? excelToDate(leanInValue) : null;

      const codeLogo1 = String(row["CODE LOGO1"] || "").trim();
      const receivedLogo = String(row["Recieved Logo"] || "").trim();
      
      let logoStatus = "Không in";
      if (codeLogo1 !== "") {
        if (receivedLogo !== "") {
          logoStatus = "Có Logo";
        } else {
          logoStatus = "Chưa có Logo";
        }
      }

      const moldType = String(row["#MOLDTYPE"] || "").trim();

      return {
        id: String(row["PRO ORDER"] || "").trim(),
        brand: String(row["Brand"] || "").trim(),
        articleCode: String(row["ArticleCode"] || "").trim(),
        quantity: Number(row["QtyOrder"] || 0),
        moldInDate: moldInStr,
        moldOutDate: moldOutStr,
        finishDate: finishStr,
        leanlineInDate: leanInStr,
        cuttingDie: String(row["#LAST"] || "").trim(),
        status: "READY",
        bom: String(row["BOM"] || "").trim(),
        moldType: moldType,
        rawStatus: String(row["Status"] || "").trim(),
        sourceLine: String(row["LINE CODE"] || "").trim().toUpperCase(),
        codeLogo1: codeLogo1,
        receivedLogo: receivedLogo,
        thangHoa: String(row["THĂNG HOA"] || "").trim(),
        logoStatus: logoStatus,
        productType: moldTypeMap.get(moldType) || null,
        descriptionPU1: String(row["Description PU1"] || "").trim(),
        descriptionFB: String(row["Description FB"] || "").trim()
      };
    }).filter((item: any) => item.id !== "");

    if (insertData.length === 0) {
      return { count: 0, message: "Không có mã PRO ORDER" };
    }

    // 4. Batch bulk insert
    const CHUNK_SIZE = 100;
    for (let i = 0; i < insertData.length; i += CHUNK_SIZE) {
      const chunk = insertData.slice(i, i + CHUNK_SIZE);
      await db.insert(orders).values(chunk)
        .onConflictDoUpdate({
          target: orders.id,
          set: {
            quantity: sql`excluded.quantity`,
            brand: sql`excluded.brand`,
            moldInDate: sql`excluded.mold_in_date`,
            moldOutDate: sql`excluded.mold_out_date`,
            finishDate: sql`excluded.finish_date`,
            leanlineInDate: sql`excluded.leanline_in_date`,
            cuttingDie: sql`excluded.cutting_die`,
            bom: sql`excluded.bom`,
            moldType: sql`excluded.mold_type`,
            rawStatus: sql`excluded.raw_status`,
            sourceLine: sql`excluded.source_line`,
            codeLogo1: sql`excluded.code_logo1`,
            receivedLogo: sql`excluded.received_logo`,
            thangHoa: sql`excluded.thang_hoa`,
            logoStatus: sql`excluded.logo_status`,
            productType: sql`excluded.product_type`,
            descriptionPU1: sql`excluded.description_pu1`,
            descriptionFB: sql`excluded.description_fb`
          }
        });
    }

    // 5. Cleanup: Xóa những đơn LOCAL không còn xuất hiện trong lần fetch này
    const fetchedIds = insertData.map((d: any) => d.id);
    if (fetchedIds.length > 0) {
        await db.delete(orders).where(sql`id NOT IN (${sql.join(fetchedIds.map((id: string) => sql`${id}`), sql`, `)})`);
    } else {
        await db.delete(orders);
    }
    
    // Tự động xóa các đơn đã Stored khỏi priority_orders
    const storedOrders = rows.filter((r: any) => String(r["Status"] || "").includes("9. Stored")).map((r: any) => String(r["PRO ORDER"] || "").trim());
    if (storedOrders.length > 0) {
        await db.delete(priorityOrdersSchema).where(sql`order_id IN (${sql.join(storedOrders.map((id: string) => sql`${id}`), sql`, `)})`);
    }

    return { count: insertData.length, success: true };
}

export async function POST() {
  try {
    const result = await syncAllData();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Lỗi đồng bộ API:", error);
    return NextResponse.json({ 
      success: false, 
      message: error?.message || String(error) 
    }, { status: 500 });
  }
}
