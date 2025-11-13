import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: "Logged out" }, { headers: { "Cache-Control": "no-store" } });
  
  res.cookies.set({
    name: "parentToken",
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "strict",
    maxAge: 0,
    expires: new Date(0)
  });

  return res;
}
