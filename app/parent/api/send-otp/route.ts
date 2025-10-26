import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|; )parentToken=([^;]+)/);
    const token = match ? match[1] : null;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: no token found." }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch {
      return NextResponse.json({ success: false, message: "Invalid or expired token." }, { status: 401 });
    }

    const parentId = decoded.parentId || decoded.studentId;
    if (!parentId) {
      return NextResponse.json({ success: false, message: "Invalid token data." }, { status: 400 });
    }

    const [rows]: any = await conn.query(
      "SELECT email FROM parents WHERE id = ? LIMIT 1",
      [parentId]
    );
    if (!rows.length) {
      return NextResponse.json({ success: false, message: "User not found for this token." }, { status: 404 });
    }

    const email = rows[0].email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await conn.query(
      `INSERT INTO parent_otps (email, otp, expires_at)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE))
       ON DUPLICATE KEY UPDATE otp=?, expires_at=DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE)`,
      [email, otp, otp]
    );

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      await transporter.sendMail({
        from: `"RFID CashTeen" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Your OTP Code for RFID Top-Up",
        text: `Your One-Time Password is: ${otp}\nThis OTP is valid for 5 minutes.`,
        html: `<h2>OTP Verification</h2><p>Your OTP is:</p><h1>${otp}</h1><p>Valid for 5 minutes.</p>`,
      });
    } catch (emailErr) {
      console.error("Failed to send OTP email:", emailErr);
    }

    return NextResponse.json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    console.error("Error in send-otp POST:", err);
    return NextResponse.json({ success: false, message: "Error sending OTP." }, { status: 500 });
  } finally {
    conn.release();
  }
}
