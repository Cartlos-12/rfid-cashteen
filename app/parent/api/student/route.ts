import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("parentToken")?.value;

  if (!token) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const studentId = decoded.studentId || decoded.id;

    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      "SELECT id, name, rfid, balance FROM users WHERE id = ? LIMIT 1",
      [studentId]
    );
    conn.release();

    const student = (rows as any[])[0];
    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, student });
  } catch (err) {
    console.error("Fetch student error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
