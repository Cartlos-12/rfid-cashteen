import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_API = "https://api.paymongo.com/v1";

function basicAuth(secret: string) {
  return "Basic " + Buffer.from(secret + ":").toString("base64");
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const { rfid, amount, wallet, otp } = await req.json();

    if (!rfid || !amount || !wallet) {
      return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
    }

    const amountNumber = Number(amount);
    if (isNaN(amountNumber) || amountNumber < 20) {
      return NextResponse.json({ success: false, message: "Amount must be at least ₱20." }, { status: 400 });
    }

    // --- Extract parentToken
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|; )parentToken=([^;]+)/);
    const token = match ? match[1] : null;
    if (!token) return NextResponse.json({ success: false, message: "Unauthorized: no token found." }, { status: 401 });

    // --- Verify JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch {
      return NextResponse.json({ success: false, message: "Invalid or expired token." }, { status: 401 });
    }

    // --- Use parentId or studentId
    const parentIdOrStudentId = decoded.parentId || decoded.studentId;
    if (!parentIdOrStudentId) return NextResponse.json({ success: false, message: "Invalid token data." }, { status: 400 });

    // --- Fetch parent email
    const [parents]: any = await conn.query(
      "SELECT email FROM parents WHERE id = ? LIMIT 1",
      [parentIdOrStudentId]
    );
    if (!parents.length) return NextResponse.json({ success: false, message: "Parent not found." }, { status: 404 });
    const email = parents[0].email;

    // --- Verify OTP
    if (otp) {
      const [otpRec]: any = await conn.query(
        "SELECT * FROM parent_otps WHERE email = ? AND otp = ? AND expires_at > UTC_TIMESTAMP()",
        [email, otp]
      );
      if (!otpRec.length) return NextResponse.json({ success: false, message: "Invalid or expired OTP." }, { status: 403 });
    }

    // --- Verify student exists
    const [students]: any = await conn.query(
      "SELECT id, rfid, name FROM users WHERE rfid = ? LIMIT 1",
      [rfid]
    );
    if (!students.length) return NextResponse.json({ success: false, message: "Student not found." }, { status: 404 });
    const student = students[0];

    const amountCentavos = Math.round(amountNumber * 100);

    // --- Create PayMongo payment link
    const pmRes = await fetch(`${PAYMONGO_API}/links`, {
      method: "POST",
      headers: {
        Authorization: basicAuth(PAYMONGO_SECRET!),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCentavos,
            description: `RFID Top-up for ${student.rfid}`,
            remarks: "RFID Top-up",
            currency: "PHP",
          },
        },
      }),
    });
    const pmJson = await pmRes.json();
    if (!pmRes.ok) {
      console.error("PayMongo error", pmJson);
      return NextResponse.json({ success: false, message: "Payment provider error.", detail: pmJson }, { status: 502 });
    }
    const redirectUrl = pmJson.data?.attributes?.checkout_url || null;

    // --- Record topup history
    await conn.query(
      `INSERT INTO topup_history (rfid, amount, wallet, email, created_at)
       VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
      [rfid, amountNumber, wallet, email]
    );

    // --- Remove OTP if used
    if (otp) await conn.query("DELETE FROM parent_otps WHERE email = ?", [email]);

    // --- Send email receipt
    const mailOptions = {
      from: `"RFID CashTeen" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Top-Up Successful — RFID CashTeen Receipt",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #2c7be5;">Top-Up Successful</h2>
          <p>Dear Parent,</p>
          <p>Your recent RFID top-up transaction was successful. Details below:</p>
          <table style="border-collapse: collapse; width: 100%; margin-top: 12px;">
            <tr><td><b>Student RFID:</b></td><td>${student.rfid}</td></tr>
            <tr><td><b>Student Name:</b></td><td>${student.name || "N/A"}</td></tr>
            <tr><td><b>Amount:</b></td><td>₱${amountNumber.toFixed(2)}</td></tr>
            <tr><td><b>Wallet:</b></td><td>${wallet}</td></tr>
            <tr><td><b>Date:</b></td><td>${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td></tr>
          </table>
          <p style="margin-top: 16px;">Check your transaction history in the Parent Dashboard.</p>
          <p style="margin-top: 16px;">Thank you for using <b>RFID CashTeen</b>!</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, redirectUrl });
  } catch (err) {
    console.error("Top-up error:", err);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  } finally {
    conn.release();
  }
}
