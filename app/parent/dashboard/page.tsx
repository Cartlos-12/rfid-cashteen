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

    const totals: number[] = last7Days.map(day =>
      transactions
        .filter(tx => {
          const txDate = new Date(tx.created_at);
          return (
            txDate.getFullYear() === day.getFullYear() &&
            txDate.getMonth() === day.getMonth() &&
            txDate.getDate() === day.getDate()
          );
        })
        .reduce((sum, tx) => sum + Number(tx.total), 0)
    );

    const maxIndex = totals.indexOf(Math.max(...totals));
    const backgroundColors = totals.map((_, idx) => (idx === maxIndex ? '#198754' : '#0d6efd'));

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
    <div className="w-100 min-vh-100 py-3 px-3 px-md-4">
      {/* Dashboard Grid */}
      <div className="row g-3 mb-4">
        {/* Total Spent Card */}
        <div className="col-12 col-md-4">
          <div className="card shadow-sm h-100 border-0">
            <div className="card-body d-flex flex-column justify-content-center align-items-center py-4">
              <h6 className="text-muted mb-2">Total Spent This Week</h6>
              <h3 className="fw-bold text-success">₱{totalThisWeek.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        {/* Weekly Expenses Chart */}
        <div className="col-12 col-md-8">
          <div className="card shadow-sm h-100 border-0">
            <div className="card-body p-2" style={{ height: '280px' }}>
              <Bar
                data={weeklyData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    title: {
                      display: true,
                      text: 'Expenses in the Last 7 Days',
                      font: { size: 12 },
                    },
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
      </div>

      {/* Recent Purchases Table */}
      <h4 className="fw-bold mb-3 text-primary">Recent Purchases</h4>
      {transactions.length === 0 ? (
        <p className="text-muted">No recent transactions.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>User</th>
                <th>Total (₱)</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.user_name}</td>
                  <td>{Number(tx.total).toFixed(2)}</td>
                  <td>
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
                  </td>
                  <td>{new Date(tx.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => alert(`View items for transaction #${tx.id}`)}
                    >
                      View Items
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
