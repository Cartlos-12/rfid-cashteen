import { NextResponse } from "next/server";
import pool from "../../lib/db";

export async function GET() {
  const conn = await pool.getConnection();
  try {
    // 🔹 Fetch all transactions with user info
    const [transactions]: any = await conn.query(
      `SELECT 
         t.id, 
         t.user_id, 
         u.name AS user_name, 
         t.total, 
         t.status, 
         t.created_at
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       ORDER BY t.created_at DESC`
    );

    // 🔹 Fetch all items linked to transactions (include item id!)
    const [items]: any = await conn.query(
      `SELECT 
         id AS item_id, 
         transaction_id, 
         item_name, 
         quantity, 
         price, 
         voided
       FROM transaction_items`
    );

    // 🔹 Group items by transaction
    const txWithItems = transactions.map((tx: any) => {
      const txItems = items
        .filter((it: any) => it.transaction_id === tx.id)
        .map((it: any) => ({
          id: it.item_id,              // ✅ keep id for void API
          item_name: it.item_name,
          quantity: it.quantity,
          price: it.price,
          voided: !!it.voided,
        }));

      return { ...tx, items: txItems };
    });

    return NextResponse.json(txWithItems);
  } catch (error: any) {
    console.error("Fetch Transactions Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
