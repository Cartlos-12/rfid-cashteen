'use client';

import { useEffect, useState } from 'react';

type Transaction = {
  id: number;
  user_id: number;
  user_name: string;
  total: number;
  status: string;
  created_at: string;
};

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const res = await fetch('/parent/api/dashboard', { credentials: 'include' });
        const json = await res.json();
        if (json.success) setTransactions(json.data.transactions || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, []);

  if (loading) return <p className="text-center py-5 text-muted">Loading dashboard...</p>;

  return (
    <div className="container">
      <h3 className="fw-bold mb-4 text-primary">Recent Purchase</h3>
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>₱{Number(tx.total).toFixed(2)}</td>
                <td>
                  <span
                    className={`badge px-3 py-2 rounded-pill ${
                      tx.status?.trim().toLowerCase() === 'completed'
                        ? 'bg-success-subtle text-success'
                        : tx.status?.trim().toLowerCase() === 'pending'
                        ? 'bg-warning-subtle text-warning'
                        : 'bg-danger-subtle text-danger'
                    }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td>{new Date(tx.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
