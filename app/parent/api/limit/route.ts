import { NextResponse } from 'next/server';
import db from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json({ success: false, message: 'Missing student ID' }, { status: 400 });
    }

    const [rows]: any = await db.query(
      'SELECT daily_limit FROM users WHERE id = ?',
      [studentId]
    );

    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, daily_limit: Number(rows[0].daily_limit || 0) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Error fetching daily limit' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { student_id, daily_limit } = await req.json();

    if (!student_id || daily_limit == null) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const [rows]: any = await db.query(
      'SELECT id FROM users WHERE id = ?',
      [student_id]
    );

    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    await db.query(
      'UPDATE users SET daily_limit = ? WHERE id = ?',
      [daily_limit, student_id]
    );

    return NextResponse.json({ success: true, message: 'Daily spending limit updated successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Error saving daily limit' }, { status: 500 });
  }
}
