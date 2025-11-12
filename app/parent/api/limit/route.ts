import { NextResponse } from 'next/server';
import db from '../../../lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('student_id'); // sessionStorage holds user_id (C-2022-0295)

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Missing student ID' }, { status: 400 });
    }

    // Fetch user by user_id (not numeric id)
    const [rows]: any = await db.query(
      'SELECT id, name, balance, daily_limit, spent_today, last_reset FROM users WHERE user_id = ?',
      [userId]
    );

    if (!rows.length) {
      return NextResponse.json({ success: false, message: 'Student not found' }, { status: 404 });
    }

    const user = rows[0];

    // Reset spent_today if last_reset is not today
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const lastReset = user.last_reset ? new Date(user.last_reset).toISOString().slice(0, 10) : null;

    if (lastReset !== today) {
      await db.query(
        'UPDATE users SET spent_today = 0, last_reset = NOW() WHERE id = ?',
        [user.id]
      );
      user.spent_today = 0;
    }

    const balance = Number(user.balance || 0);
    const daily_limit = Number(user.daily_limit || 0);
    const spent_today = Number(user.spent_today || 0);
    const remaining_limit = Math.max(daily_limit - spent_today, 0);

    return NextResponse.json({
      success: true,
      student: {
        id: user.id,
        name: user.name,
        balance,
        daily_limit,
        spent_today,
        remaining_limit,
      },
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: 'Error fetching student data' }, { status: 500 });
  }
}