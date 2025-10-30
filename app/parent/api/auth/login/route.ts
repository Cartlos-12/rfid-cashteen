// app/parent/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../../lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_key";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email and password are required" }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query("SELECT id, name, email, password FROM parents WHERE email = ?", [email]);
      const parents = rows as any[];

      if (parents.length === 0) {
        return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
      }

      const parent = parents[0];
      const validPassword = await bcrypt.compare(password, parent.password);
      if (!validPassword) {
        return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
      }

      // ✅ Generate JWT
      const token = jwt.sign({ studentId: parent.id }, JWT_SECRET, { expiresIn: "1d" });

      const response = NextResponse.json({
        success: true,
        message: "Logged in successfully",
        data: { id: parent.id, name: parent.name, email: parent.email },
      });

      // ✅ Set cookie
      response.cookies.set({
        name: "parentToken",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 1 day
      });

      return response;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Parent login error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
