import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";

// Helper: Log user actions
async function logUserAction(
  userId: string,
  userName: string,
  action: string,
  details?: string
) {
  try {
    await pool.query(
      `INSERT INTO user_logs (user_id, user_name, role, action, details) VALUES (?, ?, 'cashier', ?, ?)`,
      [userId, userName, action, details || null]
    );
  } catch (err) {
    console.error("Failed to log user action:", err);
  }
}

// ------------------ GET items ------------------
// Cashier fetch
export async function GET() {
  try {
    const [rows] = await pool.query("SELECT * FROM items ORDER BY created_at DESC");
    const items = Array.isArray(rows) ? rows : [];
    return NextResponse.json(items); // return array directly
  } catch (err) {
    console.error("Error fetching items:", err);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

// GET item by name
export async function GET_BY_NAME(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const [rows]: any = await pool.query("SELECT * FROM items WHERE name = ?", [name]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: rows[0] });
  } catch (err) {
    console.error("Error fetching item by name:", err);
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}


// ------------------ POST new item ------------------
export async function POST(req: NextRequest) {
  try {
    const { userId, userName, name, price, category } = await req.json();

    if (!name || price == null) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
    }

    const [result]: any = await pool.query(
      "INSERT INTO items (name, price, category) VALUES (?, ?, ?)",
      [name, price, category || null]
    );

    // Log cashier action
    await logUserAction(userId, userName, "Add Item", `Added "${name}" (₱${price})`);

    return NextResponse.json({ success: true, id: result.insertId, item: { id: result.insertId, name, price, category } });
  } catch (err) {
    console.error("Error adding item:", err);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

// ------------------ PUT update item ------------------
export async function PUT(req: NextRequest) {
  try {
    const { userId, userName, id, name, price, category } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    await pool.query("UPDATE items SET name = ?, price = ?, category = ? WHERE id = ?", [
      name,
      price,
      category,
      id,
    ]);

    // Log cashier action
    await logUserAction(userId, userName, "Update Item", `Updated "${name}" (₱${price})`);

    return NextResponse.json({ success: true, item: { id, name, price, category } });
  } catch (err) {
    console.error("Error updating item:", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

// ------------------ DELETE item ------------------
// ------------------ DELETE item by name ------------------
export async function DELETE(req: NextRequest) {
  try {
    const { userId, userName, name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const [rows]: any = await pool.query("SELECT * FROM items WHERE name = ?", [name]);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await pool.query("DELETE FROM items WHERE name = ?", [name]);

    // Log cashier action
    await logUserAction(userId, userName, "Delete Item", `Deleted item "${name}"`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting item:", err);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
