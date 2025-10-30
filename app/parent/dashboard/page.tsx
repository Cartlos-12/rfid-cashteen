'use client';

import { useEffect, useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      return d;
    });

    const totals: number[] = last7Days.map(day => {
      return transactions
        .filter(tx => {
          const txDate = new Date(tx.created_at);
          return (
            txDate.getFullYear() === day.getFullYear() &&
            txDate.getMonth() === day.getMonth() &&
            txDate.getDate() === day.getDate()
          );
        })
        .reduce((sum, tx) => sum + Number(tx.total), 0);
    });

    const maxIndex = totals.indexOf(Math.max(...totals));
    const backgroundColors = totals.map((_, idx) =>
      idx === maxIndex ? '#198754' : '#0d6efd'
    );

    return {
      labels: last7Days.map(d => `${days[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`),
      datasets: [
        {
          label: 'Expenses (₱)',
          data: totals,
          backgroundColor: backgroundColors,
        },
      ],
    };
  }, [transactions]);

  const totalThisWeek = useMemo(() => {
    return weeklyData.datasets[0].data.reduce((sum, val) => sum + Number(val), 0);
  }, [weeklyData]);

  if (loading) return <p className="text-center py-5 text-muted">Loading dashboard...</p>;

  return (
    <div className="container py-3">
      {/* Weekly Expenses */}
      <div className="mb-3">
        <h4 className="fw-bold text-primary mb-1">Weekly Expenses</h4>
        <p className="fs-6 fw-semibold mb-2">
          Total Spent This Week: <span className="text-success fw-bold">₱{totalThisWeek.toFixed(2)}</span>
        </p>
        <div className="card shadow-sm mb-4" style={{ maxWidth: '100%', fontSize: '0.85rem' }}>
          <div className="card-body p-2" style={{ height: '280px' }}>
            <Bar
              data={weeklyData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  title: { display: true, text: 'Expenses in the Last 7 Days', font: { size: 12 } },
                  tooltip: { enabled: true },
                },
                scales: {
                  y: { beginAtZero: true, ticks: { stepSize: 50 } },
                  x: { ticks: { font: { size: 10 } } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Purchases */}
      <h4 className="fw-bold mb-3 text-primary">Recent Purchases</h4>
      {transactions.length === 0 ? (
        <p className="text-muted">No recent transactions.</p>
      ) : (
        <div className="row g-2">
          {transactions.map(tx => (
            <div key={tx.id} className="col-12 col-sm-6 col-md-4">
              <div className="card shadow-sm h-100 border-0" style={{ fontSize: '0.85rem' }}>
                <div className="card-body d-flex flex-column justify-content-between p-2">
                  <div>
                    <h6 className="card-title mb-1">₱{Number(tx.total).toFixed(2)}</h6>
                    <p className="card-text mb-1">
                      <span
                        className={`badge px-2 py-1 rounded-pill ${
                          tx.status?.trim().toLowerCase() === 'completed'
                            ? 'bg-success-subtle text-success'
                            : tx.status?.trim().toLowerCase() === 'pending'
                            ? 'bg-warning-subtle text-warning'
                            : 'bg-danger-subtle text-danger'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </p>
                    <p className="card-text text-muted mb-1">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={() => alert(`View items for transaction #${tx.id}`)}
                  >
                    View Items
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
