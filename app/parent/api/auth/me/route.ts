import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  const token = req.cookies.get("parentToken")?.value;
  if (!token)
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const parentId = decoded.studentId || decoded.id;
  if (!parentId)
    return NextResponse.json({ success: false, message: "Invalid parent ID" }, { status: 400 });

  const conn = await pool.getConnection();
  try {
    const [parentRows] = await conn.query(
      "SELECT id, name, email FROM parents WHERE id = ? LIMIT 1",
      [parentId]
    );
    const parent = (parentRows as any[])[0];
    if (!parent) return NextResponse.json({ success: false, message: "Parent not found" }, { status: 404 });

    const [rfidRows] = await conn.query(
      "SELECT rfid, balance FROM users WHERE id = ? LIMIT 1",
      [parentId]
    );
    const rfidData = (rfidRows as any[])[0] || { rfid: null, balance: 0 };

    return NextResponse.json({
      success: true,
      data: { ...parent, rfid: rfidData.rfid, balance: rfidData.balance }
    }, { headers: { "Cache-Control": "no-store" } });
  } finally {
    conn.release();
  }
}
