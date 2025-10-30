// app/parent/api/auth/check/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_key";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("parentToken")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
    }

    // ✅ Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json({ success: true, message: "Authenticated" });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ success: false, message: "Auth check failed" }, { status: 401 });
  }
}
