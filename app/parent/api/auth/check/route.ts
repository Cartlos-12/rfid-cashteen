import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  const token = req.cookies.get("parentToken")?.value;
  if (!token) {
    return NextResponse.json({ valid: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return NextResponse.json({ valid: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ valid: false, message: "Session expired" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
}
