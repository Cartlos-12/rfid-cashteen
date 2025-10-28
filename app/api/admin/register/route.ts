import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { sendInvitationEmail } from "../../../lib/email";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const { id, firstName, lastName, email, rfid } = await req.json();

    if (!id || !firstName || !lastName || !email || !rfid) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Check if ID, email, or RFID already exists
    const [existingUsers] = await conn.query(
      `SELECT id, email, rfid FROM users WHERE id = ? OR email = ? OR rfid = ?`,
      [id, email, rfid]
    );

    if ((existingUsers as any[]).length > 0) {
      const conflicts = (existingUsers as any[]).map(u => {
        if (u.id === id) return 'ID';
        if (u.email === email) return 'Email';
        if (u.rfid === rfid) return 'RFID';
        return '';
      }).filter(Boolean).join(', ');

      return NextResponse.json({
        success: false,
        message: `Registration failed. The ${conflicts} already exist.`,
      }, { status: 409 });
    }

    await conn.beginTransaction();

    // ✅ 1️⃣ Insert into users first
    const hashedPassword = await bcrypt.hash(lastName, 10);
    // Insert into users first
await conn.query(
  `INSERT INTO users (id, first_name, last_name, name, email, rfid, password, balance, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
  [id.trim(), firstName.trim(), lastName.trim(), `${firstName.trim()} ${lastName.trim()}`, email.trim(), rfid.trim(), hashedPassword, 0.0]
);

// Insert into rfids next
await conn.query(
  `INSERT INTO rfids (id, name, rfid) VALUES (?, ?, ?)`,
  [id.trim(), `${firstName.trim()} ${lastName.trim()}`, rfid.trim()]
);


    // ✅ 3️⃣ Insert into parents if not exists
    const [existingParents] = await conn.query(
      `SELECT email FROM parents WHERE email = ?`,
      [email]
    );
    if ((existingParents as any[]).length === 0) {
      await conn.query(
        `INSERT INTO parents (id, name, email, password, created_at) VALUES (?, ?, ?, ?, NOW())`,
        [id, `${firstName} ${lastName}`, email, hashedPassword]
      );
    }

    await conn.commit();

    // Send invitation email
    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/parent/login`;
    try {
      await sendInvitationEmail({
        to: email,
        childName: `${firstName} ${lastName}`,
        defaultPassword: lastName,
        inviteLink,
      });
    } catch (mailErr) {
      console.error("Failed to send invitation email:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'RFID registered and user created successfully',
    });

  } catch (err: any) {
    await conn.rollback();
    console.error("Server error:", err);
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  } finally {
    conn.release();
  }
}
