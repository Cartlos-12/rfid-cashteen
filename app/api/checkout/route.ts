import { NextResponse } from "next/server";
import pool from "../../lib/db";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  const conn = await pool.getConnection();

  try {
    const { customerId, cart, total } = await req.json();

    await conn.beginTransaction();

    // 🔹 Deduct balance
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

    // 🔹 Get customer details (email + name)
    const [userRows]: any = await conn.query(
      "SELECT name, email FROM users WHERE id = ?",
      [customerId]
    );

    if (!userRows.length) {
      await conn.rollback();
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { name: customerName, email: customerEmail } = userRows[0];

    // 🔹 Insert transaction
    const [transaction]: any = await conn.query(
      "INSERT INTO transactions (user_id, user_name, total) VALUES (?, ?, ?)",
      [customerId, customerName, total]
    );

    // 🔹 Insert transaction items
    for (const item of cart) {
      await conn.query(
        "INSERT INTO transaction_items (transaction_id, item_id, item_name, quantity, price) VALUES (?, ?, ?, ?, ?)",
        [transaction.insertId, item.id, item.name, item.quantity, item.price]
      );
    }

    await conn.commit();

    // 🔹 Send confirmation email
    await sendPurchaseEmail(customerEmail, customerName, cart, total);

    return NextResponse.json({
      success: true,
      transactionId: transaction.insertId,
      message: "Purchase successful and email sent.",
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

// ✉️ Helper: Send branded email with logo and styled receipt
async function sendPurchaseEmail(to: string, name: string, cart: any[], total: number) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER, // cashteenrfid@gmail.com
      pass: process.env.SMTP_PASS, // your app password
    },
  });

  const itemsHtml = cart
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #eee;">${item.name}</td>
          <td style="padding:8px 12px;border:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border:1px solid #eee;text-align:right;">₱${item.price.toFixed(2)}</td>
          <td style="padding:8px 12px;border:1px solid #eee;text-align:right;">₱${(
            item.price * item.quantity
          ).toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  const mailOptions = {
    from: `"RFID CashTeen System" <${process.env.SMTP_USER}>`,
    to,
    subject: "Purchase Receipt - RFID CashTeen",
    html: `
      <div style="font-family:'Segoe UI',sans-serif;background:#f6f7fb;padding:24px;">
        <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <div style="background:#007bff;color:#fff;padding:16px;text-align:center;">
            <img src="/logo.png" alt="CashTeen Logo" width="48" height="48" style="vertical-align:middle;border-radius:50%;margin-bottom:8px;">
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
            <p style="font-size:14px;color:#555;">We appreciate your business and hope to serve you again soon!</p>
          </div>
          <div style="background:#f8f9fa;padding:12px;text-align:center;font-size:12px;color:#888;">
            This is an automated email from RFID CashTeen System. Please do not reply.
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Branded email sent successfully to ${to}`);
}
