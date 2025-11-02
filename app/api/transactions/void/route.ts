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

    // Step 1: Lock the correct transaction row
    // Step 1: Lock the correct transaction row
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

    // Step 2: Lock user row (the student)
    const [userRows] = await conn.query(
      `SELECT balance FROM users WHERE id = ? FOR UPDATE`,
      [user_id]
    );
    if ((userRows as any).length === 0) throw new Error("User not found");

    // Step 3: Handle voiding
    const voidedQuantity = quantity;
    const voidedAmount = amount;

    if (quantity === item.quantity) {
      // Void the entire item
      await conn.execute(
        `UPDATE transactions SET status = 'void' WHERE id = ?`,
        [transaction_id]
      );
    } else {
      // Partial void: reduce quantity
      await conn.execute(
        `UPDATE transactions SET quantity = quantity - ? WHERE id = ?`,
        [quantity, transaction_id]
      );
    }

    // Step 4: Refund the user (student)
    await conn.execute(
      `UPDATE users SET balance = balance + ? WHERE id = ?`,
      [voidedAmount, user_id]
    );

    // Step 5: Recalculate transaction total (sum of non-voided items in this transaction)
    const [totalRows] = await conn.query(
      `SELECT SUM(quantity * price) AS new_total
       FROM transactions
       WHERE id = ? AND status != 'void'`,
      [transaction_id]
    );
    const newTransactionTotal = (totalRows as any)[0]?.new_total || 0;

    // Update transaction total
    await conn.execute(
      `UPDATE transactions SET total = ? WHERE id = ?`,
      [newTransactionTotal, transaction_id]
    );

    // Step 6: Insert into transaction_voids (audit table)
    await conn.execute(
      `INSERT INTO transaction_voids 
         (transaction_id, transaction_item_id, amount, reason, voided_by, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [transaction_id, item_id, voidedAmount, reason || null, user_id]
    );

    // Step 7: Log the void action
    await conn.execute(
      `INSERT INTO user_logs (user_id, user_name, role, action, details, created_at)
       VALUES (?, 'cashier', 'cashier', 'VOID_ITEM', ?, NOW())`,
      [
        user_id,
        `Voided ${voidedQuantity}x ${item_name}, refunded ₱${Number(voidedAmount).toFixed(
          2
        )}. Reason: ${reason || "N/A"}`,
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
