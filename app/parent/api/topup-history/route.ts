import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const search = searchParams.get('search') || '';
    const limit = 10;
    const offset = (page - 1) * limit;

    // 🔒 Extract parentToken from cookies
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:^|; )parentToken=([^;]+)/);
    const token = match ? match[1] : null;

    if (!token)
      return NextResponse.json(
        { success: false, message: 'Unauthorized: no token found.' },
        { status: 401 }
      );

    // Verify and decode JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token.' },
        { status: 401 }
      );
    }

    // ✅ Use parentId or studentId
    const parentIdOrStudentId = decoded.parentId || decoded.studentId;
    if (!parentIdOrStudentId)
      return NextResponse.json(
        { success: false, message: 'Invalid token data.' },
        { status: 400 }
      );

    // ✅ Get parent email
    const [parentRows]: any = await conn.query(
      'SELECT email FROM parents WHERE id = ? LIMIT 1',
      [parentIdOrStudentId]
    );
    if (!parentRows.length)
      return NextResponse.json(
        { success: false, message: 'Parent not found.' },
        { status: 404 }
      );

    const email = parentRows[0].email;

    // 🔍 Build search/filter query (match ID, Amount, or Date)
    let whereClause = 'WHERE email = ?';
    const queryParams: any[] = [email];

    if (search) {
      // Use OR conditions for id, amount, and created_at date
      whereClause += ' AND (id LIKE ? OR amount LIKE ? OR DATE(created_at) LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // 📊 Count total records
    const [countRows]: any = await conn.query(
      `SELECT COUNT(*) as total FROM topup_history ${whereClause}`,
      queryParams
    );
    const totalRecords = countRows[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // 💳 Fetch transactions
    const [rows]: any = await conn.query(
      `SELECT id, rfid, email, amount, wallet, created_at
       FROM topup_history
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    const sanitizedRows = rows.map((tx: any) => ({
      ...tx,
      amount: Number(tx.amount),
    }));

    return NextResponse.json({
      success: true,
      transactions: sanitizedRows,
      totalPages,
    });

  } catch (error) {
    console.error('Error fetching top-up history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load transactions' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
