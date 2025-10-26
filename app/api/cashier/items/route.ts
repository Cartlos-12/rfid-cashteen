import { NextRequest, NextResponse } from "next/server";
import pool from "../../../lib/db";

// Helper: Log user actions
async function logUserAction(userId: string, userName: string, role: string, action: string, details?: string) {
  try {
    await pool.query(
      `INSERT INTO user_logs (user_id, user_name, role, action, details) VALUES (?, ?, ?, ?, ?)`,
      [userId, userName, role, action, details || null]
    );
  } catch (err) {
    console.error("Failed to log user action:", err);
  }
}

// 📌 GET items (Cashier + Admin use)
export async function GET() {
  try {
    const [rows] = await pool.query("SELECT * FROM items ORDER BY created_at DESC");
    return NextResponse.json({ items: rows });
  } catch (err) {
    console.error("Error fetching items:", err);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

// 📌 POST new item (Admin use)
export async function POST(req: NextRequest) {
  try {
    const { id: userId, name: userName, role, name, price, category } = await req.json();

    if (!name || !price) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
    }

    const [result]: any = await pool.query(
      "INSERT INTO items (name, price, category) VALUES (?, ?, ?)",
      [name, price, category || null]
    );

    // Log the action
    await logUserAction(userId || "unknown", userName || "Unknown", role || "admin", "Add Item", `Added "${name}" (₱${price})`);

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("Error adding item:", err);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

// 📌 PUT update item (Admin use)
export async function PUT(req: NextRequest) {
  try {
    const { id, name, price, category, userId, userName, role } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    await pool.query(
      "UPDATE items SET name = ?, price = ?, category = ? WHERE id = ?",
      [name, price, category, id]
    );

    // Log the action
    await logUserAction(userId || "unknown", userName || "Unknown", role || "admin", "Update Item", `Updated "${name}" (₱${price})`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating item:", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

// 📌 DELETE item (Admin use)
export async function DELETE(req: NextRequest) {
  try {
    const { id, userId, userName, role } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    await pool.query("DELETE FROM items WHERE id = ?", [id]);

    // Log the action
    await logUserAction(userId || "unknown", userName || "Unknown", role || "admin", "Delete Item", `Deleted item ID ${id}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting item:", err);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
