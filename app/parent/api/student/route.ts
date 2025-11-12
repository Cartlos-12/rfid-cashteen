import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("parentToken")?.value;

  if (!token) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  let conn;
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const studentId = decoded.studentId || decoded.id;

    conn = await pool.getConnection();

    // Fetch student including spent_today and last_reset
    const [rows] = await conn.query(
      "SELECT id, name, rfid, balance, daily_limit, spent_today, last_reset FROM users WHERE id = ? LIMIT 1",
      [studentId]
    );

    const student = (rows as any[])[0];
    if (!student) {
      conn.release();
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    // Reset spent_today if last_reset is not today
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const lastReset = student.last_reset ? new Date(student.last_reset).toISOString().slice(0, 10) : null;

    if (lastReset !== today) {
      await conn.query(
        "UPDATE users SET spent_today = 0, last_reset = NOW() WHERE id = ?",
        [student.id]
      );
      student.spent_today = 0;
    }

    conn.release();

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        rfid: student.rfid,
        balance: Number(student.balance || 0),
        daily_limit: Number(student.daily_limit || 0),
        spent_today: Number(student.spent_today || 0),
      },
    });
  } catch (err) {
    if (conn) conn.release();
    console.error("Fetch student error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
