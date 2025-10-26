import { NextRequest, NextResponse } from "next/server";  
import pool from "../../../../lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_key";

export async function GET(req: NextRequest) {
  try {
    // Get JWT from cookies
    const token = req.cookies.get("parentToken")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const parentId = decoded.studentId || decoded.id;
    if (!parentId) {
      return NextResponse.json(
        { success: false, message: "Invalid parent ID" },
        { status: 400 }
      );
    }

    // Fetch parent info from DB
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT id, name, email FROM parents WHERE id = ? LIMIT 1",
        [parentId]
      );

      const parent = (rows as any[])[0];
      if (!parent) {
        return NextResponse.json(
          { success: false, message: "Parent not found" },
          { status: 404 }
        );
      }

      // ✅ Return parent info
      return NextResponse.json({ success: true, data: parent });

    } finally {
      conn.release();
    }

  } catch (err) {
    console.error("Parent me API error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
