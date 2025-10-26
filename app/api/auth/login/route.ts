import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username and password required" },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();

    // Try admin first
    const [adminRows] = await pool.query(
      "SELECT id, username, password FROM admin WHERE username = ?",
      [trimmedUsername]
    );

    if ((adminRows as any[]).length > 0) {
      const admin = (adminRows as any)[0];
      const validPassword = await bcrypt.compare(password, admin.password);

      if (!validPassword) {
        return NextResponse.json(
          { success: false, message: "Invalid username or password" },
          { status: 401 }
        );
      }

      // Log admin login
      await pool.execute(
        "INSERT INTO user_logs (user_id, user_name, role, action, details) VALUES (?, ?, ?, ?, ?)",
        [admin.id, admin.username, "admin", "login", "Admin logged in"]
      );

      return NextResponse.json({
        success: true,
        user: { id: admin.id, username: admin.username, role: "admin" },
      });
    }

    // Try staff/cashier
    const [staffRows] = await pool.query(
      "SELECT id, username, password FROM staff WHERE username = ?",
      [trimmedUsername]
    );

    if ((staffRows as any[]).length > 0) {
      const staff = (staffRows as any)[0];
      const validPassword = await bcrypt.compare(password, staff.password);

      if (!validPassword) {
        return NextResponse.json(
          { success: false, message: "Invalid username or password" },
          { status: 401 }
        );
      }

      // Log cashier login
      await pool.execute(
        "INSERT INTO user_logs (user_id, user_name, role, action, details) VALUES (?, ?, ?, ?, ?)",
        [staff.id, staff.username, "cashier", "login", "Cashier logged in"]
      );

      return NextResponse.json({
        success: true,
        user: { id: staff.id, username: staff.username, role: "cashier" },
      });
    }

    // No matching user
    return NextResponse.json(
      { success: false, message: "Invalid username or password" },
      { status: 401 }
    );
  } catch (err) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
