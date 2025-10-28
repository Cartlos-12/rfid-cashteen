import { NextResponse } from "next/server";
import pool from "../../lib/db";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  const conn = await pool.getConnection();

  try {
    const { customerId, cart } = await req.json();

    if (!customerId || !cart || cart.length === 0) {
      return NextResponse.json({ error: "Invalid checkout data" }, { status: 400 });
    }

    // Calculate total
    const total = cart.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);

    await conn.beginTransaction();

    // 🔹 Check and deduct balance
    const [updateResult]: any = await conn.query(
      "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
      [total, customerId, total]
    );

    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: "Insufficient balance or customer not found" },
        { status: 400 }
      );
    }

    // 🔹 Get customer info
const [userRows]: any = await conn.query(
  "SELECT name, email, balance FROM users WHERE id = ?",
  [customerId]
);

if (!userRows.length) {
  await conn.rollback();
  return NextResponse.json({ error: "Customer not found" }, { status: 404 });
}

const { name: customerName, email: customerEmail } = userRows[0];
const newBalance = Number(userRows[0].balance); // ✅ Convert to number


    // 🔹 Insert transaction
    const [transaction]: any = await conn.query(
      "INSERT INTO transactions (user_id, user_name, total, created_at) VALUES (?, ?, ?, NOW())",
      [customerId, customerName, total]
    );

    // 🔹 Insert transaction items
    for (const item of cart) {
      await conn.query(
        "INSERT INTO transaction_items (transaction_id, item_id, item_name, quantity, price) VALUES (?, ?, ?, ?, ?)",
        [
          transaction.insertId,
          item.id,
          item.name,
          item.quantity,
          item.price,
        ]
      );
    }

    await conn.commit();

    // 🔹 Send email receipt if email exists
    if (customerEmail) {
      await sendPurchaseEmail(customerEmail, customerName, cart, total, newBalance);
    }

    return NextResponse.json({
      success: true,
      message: "Checkout successful",
      transactionId: transaction.insertId,
      newBalance,
    });
  } catch (error: any) {
    await conn.rollback();
    console.error("Checkout Error:", error);
    return NextResponse.json(
      { error: "Checkout failed", details: error.message },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

// 🔹 Helper: send branded receipt email
async function sendPurchaseEmail(
  to: string,
  name: string,
  cart: any[],
  total: number,
  newBalance: number
) {
  // ✅ Skip if credentials missing
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️ Email not sent: Missing SMTP credentials");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const itemsHtml = cart
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;">${item.name}</td>
          <td style="padding:8px 12px;border:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border:1px solid #eee;text-align:right;">₱${item.price.toFixed(
            2
          )}</td>
          <td style="padding:8px 12px;border:1px solid #eee;text-align:right;">₱${(
            item.price * item.quantity
          ).toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <div style="font-family:'Segoe UI',sans-serif;background:#f6f7fb;padding:24px;">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <div style="background:#007bff;color:#fff;padding:16px;text-align:center;">
          <h2 style="margin:8px 0 0;font-size:22px;">RFID CashTeen Receipt</h2>
        </div>
        <div style="padding:24px;">
          <p style="font-size:16px;">Hello <strong>${name}</strong>,</p>
          <p>Thank you for your purchase! Here’s your detailed receipt:</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <thead>
              <tr style="background:#f1f3f5;">
                <th style="padding:8px 12px;border:1px solid #eee;text-align:left;">Item</th>
                <th style="padding:8px 12px;border:1px solid #eee;text-align:center;">Qty</th>
                <th style="padding:8px 12px;border:1px solid #eee;text-align:right;">Price</th>
                <th style="padding:8px 12px;border:1px solid #eee;text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="font-size:18px;text-align:right;margin-top:16px;"><strong>Total: ₱${total.toFixed(
            2
          )}</strong></p>
          <p style="font-size:15px;text-align:right;margin:8px 0;">Remaining Balance: <strong>₱${newBalance.toFixed(
            2
          )}</strong></p>
          <p style="font-size:14px;color:#555;">We appreciate your business and hope to serve you again soon!</p>
        </div>
        <div style="background:#f8f9fa;padding:12px;text-align:center;font-size:12px;color:#888;">
          This is an automated email from RFID CashTeen System. Please do not reply.
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"RFID CashTeen System" <${process.env.SMTP_USER}>`,
    to,
    subject: "Purchase Receipt - RFID CashTeen",
    html,
  });
}

