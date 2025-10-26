import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

// GET users
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('search')?.trim() || '';
    let sql = `
      SELECT id, name, email, rfid, created_at, balance
      FROM users
    `;
    const params: any[] = [];

    if (q) {
      const like = `%${q}%`;
      sql += ' WHERE id LIKE ? OR name LIKE ? OR email LIKE ?';
      params.push(like, like, like);
    }

    sql += ' ORDER BY created_at DESC LIMIT 500';
    const [rows] = await pool.execute(sql, params);
    return NextResponse.json({ users: rows });
  } catch (err: any) {
    console.error('GET /api/admin/users error:', err);
    return NextResponse.json({ users: [], error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE user(s)
export async function DELETE(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const { ids } = await req.json();
    if (!ids || !ids.length)
      return NextResponse.json({ message: 'No user IDs provided' }, { status: 400 });

    await conn.beginTransaction();

    // 1️⃣ Delete from child tables first
    await conn.execute(
      `DELETE FROM rfids WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    await conn.execute(
      `DELETE FROM parents WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    // 2️⃣ Delete from users
    await conn.execute(
      `DELETE FROM users WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    await conn.execute(
      `DELETE FROM rfids WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    await conn.execute(
      `DELETE FROM parents WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    await conn.execute(
      `DELETE FROM transactions WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    await conn.commit();
    return NextResponse.json({ message: 'Users deleted successfully' });
  } catch (err: any) {
    await conn.rollback();
    console.error('DELETE /api/admin/users error:', err);
    return NextResponse.json({ message: err.message || 'Server error' }, { status: 500 });
  } finally {
    conn.release();
  }
}

// PUT user (Edit)
export async function PUT(req: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const { oldId, id, name, email, rfid } = await req.json();

    if (!oldId || !id || !name || !email) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await conn.beginTransaction();

    // Update users
    const [userResult]: any = await conn.execute(
      `UPDATE users SET id = ?, name = ?, email = ? WHERE id = ?`,
      [id, name, email, oldId]
    );

    if (userResult.affectedRows === 0) {
      await conn.rollback();
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Update rfids (only id and name, remove email)
    await conn.execute(
      `UPDATE rfids SET id = ?, name = ? WHERE id = ?`,
      [id, name, oldId]
    );

    // Update parents (id, name, email)
    await conn.execute(
      `UPDATE parents SET id = ?, name = ?, email = ? WHERE id = ?`,
      [id, name, email, oldId]
    );

    await conn.commit();
    return NextResponse.json({ message: 'User updated successfully' });
  } catch (err: any) {
    await conn.rollback();
    console.error('PUT /api/admin/users error:', err);
    return NextResponse.json({ message: err.message || 'Server error' }, { status: 500 });
  } finally {
    conn.release();
  }
}
