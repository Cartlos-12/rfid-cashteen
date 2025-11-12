import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: NextRequest) {
  const token = req.cookies.get("parentToken")?.value;
  if (!token)
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 }
    );

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const parentId = decoded.studentId || decoded.id;
  if (!parentId)
    return NextResponse.json(
      { success: false, message: "Invalid parent ID" },
      { status: 400 }
    );

  const body = await req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword)
    return NextResponse.json(
      { success: false, message: "All fields are required" },
      { status: 400 }
    );

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT password FROM parents WHERE id = ? LIMIT 1",
      [parentId]
    );
    const parent = (rows as any[])[0];

    if (!parent)
      return NextResponse.json(
        { success: false, message: "Parent not found" },
        { status: 404 }
      );

    const passwordMatch = await bcrypt.compare(currentPassword, parent.password);
    if (!passwordMatch)
      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 401 }
      );

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await conn.query("UPDATE parents SET password = ? WHERE id = ?", [
      hashedPassword,
      parentId,
    ]);

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } finally {
    conn.release();
  }
}
