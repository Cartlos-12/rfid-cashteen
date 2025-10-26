import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_key";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("parentToken")?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  // Verify JWT
  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
  }

  const parentId = decoded.studentId || decoded.id;
  if (!parentId) {
    return NextResponse.json({ success: false, message: "Invalid parent ID" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    // Fetch all transactions for this parent
    const [transactions] = await conn.query(
      "SELECT t.id, t.total, t.status, t.created_at, u.name as user_name FROM transactions t INNER JOIN parents u ON t.user_id = u.id WHERE t.user_id = ? ORDER BY t.created_at DESC",
      [parentId]
    );

    const transactionArray = transactions as any[];

    if (transactionArray.length === 0) {
      return NextResponse.json([]); // No transactions
    }

    // Fetch all items for these transactions
    const [items] = await conn.query(
      `SELECT transaction_id, item_name as name, price, quantity 
       FROM transaction_items 
       WHERE transaction_id IN (${transactionArray.map(() => "?").join(",")})`,
      transactionArray.map(tx => tx.id)
    );

    const itemsArray = items as any[];

    // Map items to transactions
    const txWithItems = transactionArray.map(tx => ({
      ...tx,
      items: itemsArray.filter(i => i.transaction_id === tx.id)
    }));

    return NextResponse.json(txWithItems);

  } finally {
    conn.release();
  }
}
