import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_key";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("parentToken")?.value;
  if (!token) return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
  }

  const parentId = decoded.studentId || decoded.id;
  if (!parentId) return NextResponse.json({ success: false, message: "Invalid parent ID" }, { status: 400 });

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id, user_id, user_name, item_id, item_name, quantity, price, total, status, created_at
       FROM transactions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [parentId]
    );

    const transactionRows = rows as any[];

    // Group rows by transaction id
    const transactionsMap: Record<string, any> = {};
    transactionRows.forEach(row => {
      if (!transactionsMap[row.id]) {
        transactionsMap[row.id] = {
          id: row.id,
          user_name: row.user_name,
          total: 0,
          status: row.status,
          created_at: row.created_at,
          items: []
        };
      }

      transactionsMap[row.id].items.push({
        id: row.item_id,
        name: row.item_name,
        price: Number(row.price) || 0,
        quantity: Number(row.quantity) || 0
      });

      transactionsMap[row.id].total += Number(row.total) || 0;
    });

    return NextResponse.json(Object.values(transactionsMap));

  } finally {
    conn.release();
  }
}
