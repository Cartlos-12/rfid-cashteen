'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Receipt, CashCoin } from 'react-bootstrap-icons';

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
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const verifySessionAndFetch = async () => {
      try {
        const checkRes = await fetch('/parent/api/auth/check', { credentials: 'include' });
        if (!checkRes.ok) throw new Error('Session expired');

        const res = await fetch('/parent/api/dashboard', { credentials: 'include' });
        const json = await res.json();
        if (json.success && !cancelled) {
          setTransactions(json.data.transactions || []);
        }
      } catch (err) {
        if (!cancelled) router.replace('/parent/login');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCheckingSession(false);
        }
      }
    };

    verifySessionAndFetch();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
    const backgroundColors = totals.map((_, idx) =>
      idx === maxIndex ? '#22c55e' : 'rgba(59,130,246,0.8)'
    );

    return {
      labels: last7Days.map(d => days[d.getDay()]),
      datasets: [
        {
          label: 'Expenses (₱)',
          data: totals,
          backgroundColor: backgroundColors,
          borderRadius: 8,
        },
      ],
    };
  }, [transactions]);

  const summaryMetrics = useMemo(() => {
    const totalTransactions = transactions.length;
    const totalSpentThisWeek = weeklyData.datasets[0].data.reduce((sum, val) => sum + Number(val), 0);
    return { totalTransactions, totalSpentThisWeek };
  }, [transactions, weeklyData]);

  // Removed loading overlay, now content fades in smoothly
  return (
    <>
      <div className={`dashboard-container ${!loading && !checkingSession ? 'fade-in' : ''}`}>
        <div className="header mb-4">
          <h2 className="fw-bold text-primary-color mb-2">Dashboard Overview</h2>
          <p className="text-muted mb-0">Monitor your spending and transaction insights</p>
        </div>

        {/* Summary Metrics */}
        <div className="summary-metrics mb-4">
          <div className="metric-card">
            <div className="icon-wrapper blue">
              <Receipt size={28} />
            </div>
            <div className="metric-text">
              <h6>Total Transactions</h6>
              <h3>{summaryMetrics.totalTransactions}</h3>
            </div>
          </div>

          <div className="metric-card">
            <div className="icon-wrapper green">
              <CashCoin size={28} />
            </div>
            <div className="metric-text">
              <h6>Total Spent This Week</h6>
              <h3>₱{summaryMetrics.totalSpentThisWeek.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="chart-card mb-4">
          <h5 className="fw-semibold mb-3">Weekly Expenses</h5>
          <div className="chart-wrapper">
            <Bar
              data={weeklyData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { color: '#555' },
                    grid: { color: '#eee' },
                  },
                  x: {
                    ticks: { color: '#555' },
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="recent-purchases">
          <h5 className="fw-semibold text-primary-color mb-3">Recent Purchases</h5>
          {transactions.length === 0 ? (
            <div className="no-transactions">No recent transactions found.</div>
          ) : (
            <div className="table-card modern-table">
              <div className="table-scroll-wrapper">
                <table className="table modern">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Total</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} className="fade-in">
                        <td className="fw-semibold">{tx.user_name}</td>
                        <td>
                          <span className="badge bg-success-light">
                            ₱{Number(tx.total).toFixed(2)}
                          </span>
                        </td>
                        <td className="text-muted">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 1rem;
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .dashboard-container.fade-in {
          opacity: 1;
          transform: translateY(0);
        }
        .summary-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.2rem;
        }
        .metric-card {
          background: linear-gradient(135deg, #ffffff, #f8fafc);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        }
        .metric-text h6 {
          font-size: 0.9rem;
          color: #666;
          margin: 0;
        }
        .metric-text h3 {
          font-size: 1.8rem;
          font-weight: 700;
          color: #222;
          margin: 0;
        }
        .icon-wrapper {
          width: 54px;
          height: 54px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 12px;
          color: #fff;
        }
        .blue { background: linear-gradient(135deg, #3b82f6, #60a5fa); }
        .green { background: linear-gradient(135deg, #22c55e, #4ade80); }
        .chart-card {
          background: #fff;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 6px 18px rgba(0,0,0,0.05);
        }
        .chart-wrapper { height: 350px; }
        .modern-table {
          background: linear-gradient(180deg, #ffffff, #f9fafb);
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .modern-table:hover {
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
        }
        .table-scroll-wrapper { max-height: 380px; overflow-y: auto; }
        .table.modern { width: 100%; border-collapse: separate; border-spacing: 0; }
        .table.modern th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 2;
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 0.5px;
          padding: 0.9rem 1rem;
        }
        .table.modern tbody tr {
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .table.modern tbody tr:hover {
          background: #f8fafc;
          transform: translateX(3px);
        }
        .table.modern td {
          padding: 0.85rem 1rem;
          border-top: 1px solid #f1f5f9;
        }
        .badge.bg-success-light {
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
          padding: 0.35rem 0.7rem;
          border-radius: 8px;
          font-weight: 600;
        }
        .fade-in {
          animation: fadeIn 0.4s ease forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .no-transactions {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
          font-style: italic;
        }
        @media (max-width: 768px) {
          .dashboard-container { padding: 1rem; }
          .metric-card { padding: 16px; }
          .metric-text h3 { font-size: 1.4rem; }
        }
      `}</style>
    </>
  );
}
