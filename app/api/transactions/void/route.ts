// app/api/transactions/void/route.ts
import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";

export async function POST(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    // Parse request body and log it
    const body = await req.json();
    console.log("Void request body:", body);

    const { transactionId, itemId, quantity, reason } = body;

    // Stricter validation: only block if null/undefined
    if (transactionId == null || itemId == null) {
      return NextResponse.json(
        { success: false, error: "transactionId and itemId required" },
        { status: 400 }
      );
    }

    // Fetch transaction
    const [txRows]: any = await conn.query(
      "SELECT id, user_id, total FROM transactions WHERE id = ?",
      [transactionId]
    );
    if (!txRows.length)
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    const tx = txRows[0];

    // Fetch transaction item
    const [itemRows]: any = await conn.query(
      "SELECT id, transaction_id, item_name, quantity, price, voided FROM transaction_items WHERE id = ? AND transaction_id = ?",
      [itemId, transactionId]
    );
    if (!itemRows.length)
      return NextResponse.json(
        { success: false, error: "Transaction item not found" },
        { status: 404 }
      );
    const item = itemRows[0];
    if (Number(item.voided))
      return NextResponse.json(
        { success: false, error: "Item already voided" },
        { status: 400 }
      );

    // Decide quantity
    const voidQty =
      typeof quantity === "number" ? Number(quantity) : Number(item.quantity);

    if (voidQty <= 0 || voidQty > Number(item.quantity)) {
      return NextResponse.json(
        { success: false, error: "Invalid void quantity" },
        { status: 400 }
      );
    }

    const refundAmount = Number(item.price) * voidQty;

    await conn.beginTransaction();

    // Update item
    if (voidQty === Number(item.quantity)) {
      await conn.query("UPDATE transaction_items SET voided = 1 WHERE id = ?", [itemId]);
    } else {
      const newQty = Number(item.quantity) - voidQty;
      await conn.query("UPDATE transaction_items SET quantity = ? WHERE id = ?", [newQty, itemId]);
    }

    // Update totals & refund
    await conn.query("UPDATE transactions SET total = total - ? WHERE id = ?", [refundAmount, transactionId]);
    await conn.query("UPDATE users SET balance = balance + ? WHERE id = ?", [refundAmount, tx.user_id]);

    // Log void
    await conn.query(
      "INSERT INTO transaction_voids (transaction_id, transaction_item_id, amount, reason) VALUES (?, ?, ?, ?)",
      [transactionId, itemId, refundAmount, reason || null]
    );

    await conn.commit();

    return NextResponse.json({
      success: true,
      refund: refundAmount,
      message: "Item voided and refunded.",
    });
  } catch (err: any) {
    try {
      await conn.rollback();
    } catch {}
    console.error("Void error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Void failed" },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
