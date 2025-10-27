import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function GET(req: NextRequest) {
  try {
    const rfidTag = req.nextUrl.searchParams.get("rfid");

    if (!rfidTag) {
      return NextResponse.json({ error: "No RFID provided" }, { status: 400 });
    }

    const [rows]: any = await pool.query(
      "SELECT id, name, rfid, balance FROM users WHERE rfid = ?",
      [rfidTag]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "RFID not found in users table" }, { status: 404 });
    }

    // ✅ Return in expected format for frontend
    return NextResponse.json({
      customer: {
        id: rows[0].id,
        name: rows[0].name,
        rfid: rows[0].rfid,
        balance: rows[0].balance,
      }
    });
  } catch (error: any) {
    console.error("RFID Scan Error:", error);
    return NextResponse.json({ error: "Failed to fetch RFID data" }, { status: 500 });
  }
}
