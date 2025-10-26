import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

// ✅ GET items (with optional search)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const query = search
      ? `SELECT * FROM items WHERE name LIKE ? OR category LIKE ? ORDER BY created_at DESC`
      : `SELECT * FROM items ORDER BY created_at DESC`;
    const params = search ? [`%${search}%`, `%${search}%`] : [];
    const [rows] = await pool.query(query, params);
    return NextResponse.json({ items: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}

// ✅ POST add new item
export async function POST(req: NextRequest) {
  try {
    const { name, price, category } = await req.json();
    if (!name || !price)
      return NextResponse.json(
        { success: false, message: 'Name and price are required' },
        { status: 400 }
      );

    await pool.query(
      'INSERT INTO items (name, price, category) VALUES (?, ?, ?)',
      [name, price, category || null]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

// ✅ PUT update item
export async function PUT(req: NextRequest) {
  try {
    const { id, name, price, category } = await req.json();
    if (!id || !name || !price)
      return NextResponse.json(
        { success: false, message: 'ID, name, and price are required' },
        { status: 400 }
      );

    await pool.query(
      'UPDATE items SET name=?, price=?, category=? WHERE id=?',
      [name, price, category || null, id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

// ✅ DELETE item (safe and Turbopack-compatible)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id)
    return NextResponse.json(
      { success: false, message: 'ID required' },
      { status: 400 }
    );

  const conn = await pool.getConnection();
  try {
    const [rows]: any = await conn.query(
      'SELECT COUNT(*) AS count FROM transaction_items WHERE item_id = ?',
      [id]
    );

    if (rows[0].count > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Cannot delete this item because it is used in past transactions.',
        },
        { status: 400 }
      );
    }

    await conn.query('DELETE FROM items WHERE id=?', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
