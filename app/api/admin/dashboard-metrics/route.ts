import { NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET() {
  try {
    // Fetch total users
    const [users] = await pool.query('SELECT COUNT(*) as totalUsers FROM rfids');

    // Fetch active users today
    const [active] = await pool.query(
      'SELECT COUNT(*) as activeUsersToday FROM transactions WHERE DATE(created_at) = CURDATE()'
    );

    // Total transactions
    const [transactions] = await pool.query('SELECT COUNT(*) as totalTransactions FROM transactions');

    // Revenue today
    const [revenue] = await pool.query(
      'SELECT IFNULL(SUM(total),0) as revenueToday FROM transactions WHERE DATE(created_at) = CURDATE()'
    );

    // Low balance users
    const [lowBalance] = await pool.query('SELECT COUNT(*) as lowBalanceUsers FROM users WHERE balance < 50');

    const data = {
      totalUsers: users[0].totalUsers,
      activeUsersToday: active[0].activeUsersToday,
      totalTransactions: transactions[0].totalTransactions,
      revenueToday: revenue[0].revenueToday,
      lowBalanceUsers: lowBalance[0].lowBalanceUsers,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
