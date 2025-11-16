import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("parentToken")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Not authenticated. Please log in." },
      { status: 401 }
    );
  }

  let conn;
  try {
    // Verify JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      console.error("JWT verification failed:", jwtErr);
      return NextResponse.json(
        { success: false, message: "Invalid session token." },
        { status: 401 }
      );
    }

    const studentId = decoded.studentId || decoded.id;
    if (!studentId) {
      return NextResponse.json(
        { success: false, message: "Invalid token payload." },
        { status: 400 }
      );
    }

    // Get DB connection
    try {
      conn = await pool.getConnection();
    } catch (dbConnErr) {
      console.error("DB connection failed:", dbConnErr);
      return NextResponse.json(
        { success: false, message: "Database connection error." },
        { status: 500 }
      );
    }

    // Fetch student
    let student;
    try {
      const [rows] = await conn.query(
        "SELECT id, name, rfid, balance, daily_limit, spent_today, last_reset FROM users WHERE id = ? LIMIT 1",
        [studentId]
      );
      student = (rows as any[])[0];
      if (!student) {
        return NextResponse.json(
          { success: false, message: "Student not found." },
          { status: 404 }
        );
      }
    } catch (queryErr) {
      console.error("DB query error:", queryErr);
      return NextResponse.json(
        { success: false, message: "Failed to fetch student data." },
        { status: 500 }
      );
    }

    // Reset spent_today if last_reset is not today
    const today = new Date().toISOString().slice(0, 10);
    const lastReset = student.last_reset
      ? new Date(student.last_reset).toISOString().slice(0, 10)
      : null;

    if (lastReset !== today) {
      try {
        await conn.query(
          "UPDATE users SET spent_today = 0, last_reset = NOW() WHERE id = ?",
          [student.id]
        );
        student.spent_today = 0;
      } catch (resetErr) {
        console.error("Failed to reset spent_today:", resetErr);
        // Do not block response; just log
      }
    }

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
    console.error("Unexpected error in /student route:", err);
    return NextResponse.json(
      { success: false, message: "Server encountered an unexpected error." },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}
