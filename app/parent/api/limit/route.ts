// /app/parent/api/limit/route.ts
import { NextResponse } from 'next/server';
import db from '../../../lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { student_id, daily_limit } = body;

    if (!student_id || daily_limit === undefined) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    // Check if student exists
    const [rows]: any = await db.query(
      'SELECT id FROM users WHERE id = ?',
      [student_id]
    );

    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    // Update daily limit
    await db.query(
      'UPDATE users SET daily_limit = ? WHERE id = ?',
      [daily_limit, student_id]
    );

    return NextResponse.json({ success: true, message: 'Daily limit updated successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Error updating limit' }, { status: 500 });
  }
}
