import { db } from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    return new Response(JSON.stringify(rows[0]), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Database connection failed' }), { status: 500 });
  }
}
