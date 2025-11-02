// app/api/admin/popular-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET(req: NextRequest) {
  try {
    // Get top 10 most sold items, ignoring voided items
    const [rows]: any = await pool.query(`
      SELECT item_id, item_name, SUM(quantity) AS sold
      FROM transactions 
      GROUP BY item_id, item_name
      ORDER BY sold DESC
      LIMIT 10
    `);

    return NextResponse.json({ items: rows });
  } catch (err: any) {
    console.error("GET /api/admin/popular-items error:", err);
    return NextResponse.json({ items: [], error: err.message || "Server error" }, { status: 500 });
  }
}
