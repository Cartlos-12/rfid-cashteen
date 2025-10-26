// app/parent/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_key";

export async function GET(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const token = req.cookies.get("parentToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    const studentId = decoded.studentId;
    if (!studentId) {
      return NextResponse.json({ success: false, message: "Invalid student ID" }, { status: 400 });
    }

    // Fetch student info
    const [studentRows] = await conn.query(
      "SELECT id, name, rfid, balance FROM users WHERE id = ? LIMIT 1",
      [studentId]
    );
    const student = (studentRows as any[])[0];
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    // Fetch recent transactions
    const [transactions] = await conn.query(
      `SELECT id, user_id, user_name, total, status, created_at
       FROM transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [studentId]
    );

    return NextResponse.json({ success: true, data: { student, transactions: transactions as any[] } });
  } catch (err: any) {
    console.error("Dashboard API error:", err);
    return NextResponse.json({ success: false, message: "Server error", error: err.message }, { status: 500 });
  } finally {
    conn.release();
  }
}
