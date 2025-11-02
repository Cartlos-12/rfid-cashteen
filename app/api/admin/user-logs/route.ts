import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const dateQuery = url.searchParams.get("date");

    let startDate: string;
    let endDate: string;

    if (dateQuery) {
      startDate = `${dateQuery} 00:00:00`;
      endDate = `${dateQuery} 23:59:59`;
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      startDate = `${yyyy}-${mm}-${dd} 00:00:00`;
      endDate = `${yyyy}-${mm}-${dd} 23:59:59`;
    }

    const [rows]: any = await pool.execute(
      `
      SELECT * FROM user_logs
      WHERE created_at BETWEEN ? AND ?
      ORDER BY created_at DESC
      LIMIT 1000
      `,
      [startDate, endDate]
    );

    const logs = rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      role: row.role || "cashier",
      action: row.action || "Unknown",
      details: row.details || null,
      created_at: row.created_at,
    }));

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error("GET /api/admin/user-logs error:", err);
    return NextResponse.json(
      { logs: [], error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// ✅ ADD THIS: POST to record Add to Cart, Payment, etc.
export async function POST(req: NextRequest) {
  try {
    const { user_id, user_name, role, action, details } = await req.json();

    if (!user_id || !user_name || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await pool.execute(
      `INSERT INTO user_logs (user_id, user_name, role, action, details, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [user_id, user_name, role || "cashier", action, details || null]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/admin/user-logs error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
