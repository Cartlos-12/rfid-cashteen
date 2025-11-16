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

    const total = cart.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    await conn.beginTransaction();

    // 🔹 Fetch user info
    const [userRows]: any = await conn.query(
      "SELECT id, name, email, balance, daily_limit, spent_today, last_reset FROM users WHERE id = ?",
      [customerId]
    );

    if (!userRows.length) {
      await conn.rollback();
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customer = userRows[0];
    const customerName = customer.name;
    const customerEmail = customer.email;
    const currentBalance = Number(customer.balance);
    const dailyLimit = Number(customer.daily_limit || 0);
    let spentToday = Number(customer.spent_today || 0);
    const lastReset = customer.last_reset ? new Date(customer.last_reset) : null;

    // 🔹 Reset spent_today if last_reset was before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!lastReset || lastReset < today) {
      spentToday = 0;
      await conn.query(
        "UPDATE users SET spent_today = 0, last_reset = NOW() WHERE id = ?",
        [customerId]
      );
    }

    // 🔹 Check balance & daily limit
    if (total > currentBalance) {
      await conn.rollback();
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }
    if (dailyLimit > 0 && spentToday + total > dailyLimit) {
      await conn.rollback();
      return NextResponse.json({
        error: `Exceeds daily spending limit. You can only spend ₱${(dailyLimit - spentToday).toFixed(2)} today.`,
      }, { status: 400 });
    }

    // 🔹 Deduct balance & update spent_today
    await conn.query(
      "UPDATE users SET balance = balance - ?, spent_today = spent_today + ?, last_reset = NOW() WHERE id = ?",
      [total, total, customerId]
    );

    // 🔹 Generate base receipt ID
    const receiptId = `TX-${Date.now()}`;

    // 🔹 Insert transactions using unique ID per item
    const transactionPromises = cart.map((item: any, index: number) => {
      const transactionId = `${receiptId}-${index + 1}`; // unique for each item
      return conn.query(
        `INSERT INTO transactions 
         (id, user_id, user_name, item_id, item_name, quantity, price, total, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', NOW())`,
        [transactionId, customerId, customerName, item.id, item.name, item.quantity, item.price, item.price * item.quantity]
      );
    });

    await Promise.all(transactionPromises);
    await conn.commit();

    // 🔹 Send email receipt
    if (customerEmail) {
      await sendPurchaseEmail(customerEmail, customerName, cart, total, currentBalance - total, receiptId);
    }

    return NextResponse.json({
      success: true,
      message: "Checkout successful",
      receiptId,
      newBalance: currentBalance - total,
      spentToday: spentToday + total,
      remainingLimit: dailyLimit > 0 ? dailyLimit - (spentToday + total) : null,
      attemptedSpend: total,
    });
  } catch (error: any) {
    await conn.rollback();
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: "Checkout failed", details: error.message }, { status: 500 });
  } finally {
    conn.release();
  }
}

// 🔹 Email function with receiptId
async function sendPurchaseEmail(to: string, name: string, cart: any[], total: number, newBalance: number, receiptId: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

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
          <td style="padding:8px 12px;border:1px solid #eee;text-align:right;">₱${item.price.toFixed(2)}</td>
          <td style="padding:8px 12px;border:1px solid #eee;text-align:right;">₱${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const html = `
  <div style="font-family:'Segoe UI',sans-serif;background:#f6f7fb;padding:24px;">
    <div style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <div style="background:#007bff;color:#fff;padding:16px;text-align:center;">
        <h2 style="margin:8px 0 0;font-size:22px;">RFID CashTeen Receipt</h2>
        <p style="margin:0;font-size:14px;">Receipt ID: ${receiptId}</p>
      </div>
      <div style="padding:24px;">
        <p>Hello <strong>${name}</strong>,</p>
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
        <p style="text-align:right;margin-top:16px;font-size:16px;"><strong>Total: ₱${total.toFixed(2)}</strong></p>
        <p style="text-align:right;margin:8px 0;">Remaining Balance: <strong>₱${newBalance.toFixed(2)}</strong></p>
      </div>
      <div style="background:#f8f9fa;padding:12px;text-align:center;font-size:12px;color:#888;">
        This is an automated email from RFID CashTeen System. Please do not reply.
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: `"RFID CashTeen System" <${process.env.SMTP_USER}>`,
    to,
    subject: `Purchase Receipt - RFID CashTeen (${receiptId})`,
    html,
  });
}
