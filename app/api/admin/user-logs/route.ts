import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const { userId, userName, role, action, details } = await req.json();

    if (!userId || !userName || !action) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    await pool.execute(
      `INSERT INTO user_logs (user_id, user_name, role, action, details) VALUES (?, ?, ?, ?, ?)`,
      [userId, userName, role || 'cashier', action, details || null]
    );

    return NextResponse.json({ success: true, message: 'Action logged successfully' });
  } catch (err: any) {
    console.error('POST /api/admin/user-logs error:', err);
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let sql = `SELECT * FROM user_logs WHERE 1=1`;
    const params: any[] = [];

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    sql += ` AND DATE(created_at) >= ?`;
    params.push(startDate || todayStr);

    sql += ` AND DATE(created_at) <= ?`;
    params.push(endDate || todayStr);

    sql += ` ORDER BY created_at DESC LIMIT 1000`;

    const [rows]: any = await pool.execute(sql, params);

    const logs = rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      user_name: row.user_name,
      role: row.role || 'cashier',
      action: row.action || 'Unknown',
      details: row.details || null,
      created_at: row.created_at,
    }));

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error('GET /api/admin/user-logs error:', err);
    return NextResponse.json({ logs: [], error: err.message || 'Server error' }, { status: 500 });
  }
}
