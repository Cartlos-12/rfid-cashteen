import { NextResponse } from "next/server"; 
import mysql from "mysql2/promise";

export async function GET() {
  try {
    const conn = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "cashteen_db",
    });

    // Fetch all transaction items
    const [rows]: any = await conn.query(
      `SELECT 
         id,
         user_id,
         user_name,
         item_id,
         item_name,
         quantity,
         price,
         total,
         status,
         created_at
       FROM transactions
       ORDER BY created_at DESC`
    );

    await conn.end();

    // Group items by transaction id
    const grouped = Object.values(
      rows.reduce((acc: any, tx: any) => {
        if (!acc[tx.id]) {
          acc[tx.id] = {
            id: tx.id,
            user_id: tx.user_id,
            user_name: tx.user_name,
            total: tx.total,
            created_at: tx.created_at,
            status: tx.status, // transaction status
            items: [],
          };
        }
        acc[tx.id].items.push({
          id: tx.item_id,
          item_name: tx.item_name,
          quantity: tx.quantity,
          price: tx.price,
          status: tx.status, // ✅ include item status
        });
        return acc;
      }, {})
    );

    return NextResponse.json(grouped);
  } catch (err) {
    console.error("Fetch Transactions Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
