// app/parent/api/auth/check/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(request: NextRequest) {
  const token = request.cookies.get("parentToken")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return NextResponse.json({ valid: true });
  } catch {
    // Expired or invalid token
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
}
