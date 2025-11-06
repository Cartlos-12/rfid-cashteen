import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: "Logged out" }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set({ name: "parentToken", value: "", path: "/", maxAge: 0 });
  return res;
}
