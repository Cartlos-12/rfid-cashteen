import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  const token = req.cookies.get("parentToken")?.value;

  if (!token) {
    const res = NextResponse.json({ valid: false, message: "Unauthorized" }, { status: 401 });
    res.cookies.set({ name: "parentToken", value: "", httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", sameSite: "strict", maxAge: 0, expires: new Date(0) });
    return res;
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return NextResponse.json({ valid: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    const res = NextResponse.json({ valid: false, message: "Session expired" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    res.cookies.set({ name: "parentToken", value: "", httpOnly: true, secure: process.env.NODE_ENV === "production", path: "/", sameSite: "strict", maxAge: 0, expires: new Date(0) });
    return res;
  }
}
