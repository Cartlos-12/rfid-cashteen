import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "cashteen_db",
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { transaction_id, item_id, quantity, amount, reason, user_id } = body;

  if (!transaction_id || !item_id || !quantity || !amount || !user_id) {
    return NextResponse.json(
      { success: false, message: "Missing required fields" },
      { status: 400 }
    );
  }

  const conn = await getConnection();

  try {
    await conn.beginTransaction();

    // Lock the specific item row
    const [itemRows] = await conn.query(
      `SELECT id, item_id, item_name, quantity, price, status
       FROM transactions
       WHERE id = ? AND item_id = ? FOR UPDATE`,
      [transaction_id, item_id]
    );

    const item = (itemRows as any)[0];
    if (!item) throw new Error("Transaction item not found");
    if (item.status === "void") throw new Error("Item already voided");
    if (quantity > item.quantity || quantity < 1) throw new Error("Invalid quantity to void");

    const item_name = item.item_name || "Unknown Item";

    // Lock user row
    const [userRows] = await conn.query(
      `SELECT balance FROM users WHERE id = ? FOR UPDATE`,
      [user_id]
    );
    if ((userRows as any).length === 0) throw new Error("User not found");

    // Void the item or reduce quantity
    if (quantity === item.quantity) {
      // Full item void
      await conn.execute(
        `UPDATE transactions SET status = 'void' WHERE id = ? AND item_id = ?`,
        [transaction_id, item_id]
      );
    } else {
      // Partial void
      await conn.execute(
        `UPDATE transactions SET quantity = quantity - ? WHERE id = ? AND item_id = ?`,
        [quantity, transaction_id, item_id]
      );
    }

    // Refund user
    await conn.execute(
      `UPDATE users SET balance = balance + ? WHERE id = ?`,
      [amount, user_id]
    );

    // Recalculate transaction total (sum of non-voided items)
    const [totalRows] = await conn.query(
      `SELECT SUM(quantity * price) AS new_total
       FROM transactions
       WHERE id = ? AND status != 'void'`,
      [transaction_id]
    );
    const newTransactionTotal = (totalRows as any)[0]?.new_total || 0;

    await conn.execute(
      `UPDATE transactions SET total = ? WHERE id = ?`,
      [newTransactionTotal, transaction_id]
    );

    // Audit table
    await conn.execute(
      `INSERT INTO transaction_voids 
         (transaction_id, transaction_item_id, amount, reason, voided_by, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [transaction_id, item_id, amount, reason || null, user_id]
    );

    // Log
    await conn.execute(
      `INSERT INTO user_logs (user_id, user_name, role, action, details, created_at)
       VALUES (?, 'cashier', 'cashier', 'VOID_ITEM', ?, NOW())`,
      [
        user_id,
        `Voided ${quantity}x ${item_name}, refunded ₱${Number(amount).toFixed(2)}. Reason: ${reason || "N/A"}`
      ]
    );

    await conn.commit();
    await conn.end();

    return NextResponse.json({
      success: true,
      message: "Item voided successfully and user refunded.",
      new_transaction_total: newTransactionTotal,
    });
  } catch (err: any) {
    await conn.rollback();
    await conn.end();
    console.error("Void error:", err);
    return NextResponse.json(
      { success: false, message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}
