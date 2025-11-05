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
    const backgroundColors = totals.map((_, idx) => (idx === maxIndex ? '#4caf50' : '#2196f3'));

    return {
      labels: last7Days.map(d => days[d.getDay()]),
      datasets: [
        {
          label: 'Expenses (₱)',
          data: totals,
          backgroundColor: backgroundColors,
          borderRadius: 6,
        },
      ],
    };
  }, [transactions]);

  const summaryMetrics = useMemo(() => {
    const totalTransactions = transactions.length;
    const totalSpentThisWeek = weeklyData.datasets[0].data.reduce((sum, val) => sum + Number(val), 0);
    return { totalTransactions, totalSpentThisWeek };
  }, [transactions, weeklyData]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="header w-100 justify-content-start mb-4">
        <h2 className="text-primary-color">Dashboard Overview</h2>
      </div>

      {/* Summary Metrics */}
      <div className="summary-metrics mb-4">
        <div className="metric-card">
          <div className="icon-wrapper blue">
            <Receipt size={32} />
          </div>
          <div className="metric-text">
            <h6>Total Transactions</h6>
            <h3>{summaryMetrics.totalTransactions}</h3>
          </div>
        </div>

        <div className="metric-card">
          <div className="icon-wrapper green">
            <CashCoin size={32} />
          </div>
          <div className="metric-text">
            <h6>Total Spent This Week</h6>
            <h3>₱{summaryMetrics.totalSpentThisWeek.toFixed(2)}</h3>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="chart-card mb-4">
        <Bar
          data={weeklyData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: 'Weekly Expenses',
                font: { size: 18, weight: 'bold' },
                color: '#333',
              },
            },
            scales: {
  y: {
    beginAtZero: true,
    ticks: {
      stepSize: 50, // <-- sets the increment of y-axis labels
      color: '#555', // optional: label color
    },
    grid: {
      color: '#eee', // optional: grid line color
    },
  },
  x: {
    grid: { display: false },
    ticks: {
      color: '#555', // optional: x-axis label color
    },
  },
}
,
          }}
        />
      </div>

      {/* Recent Purchases */}
      <div className="recent-purchases w-100">
        <h4 className="text-primary-color">Recent Purchases</h4>
        {transactions.length === 0 ? (
          <div className="no-transactions">No recent transactions found.</div>
        ) : (
          <div className="table-card">
            <div className="table-scroll-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{tx.user_name}</td>
                      <td className="text-success">₱{Number(tx.total).toFixed(2)}</td>
                      <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .summary-metrics {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        /* ✅ Square & Modern Metric Cards */
        .metric-card {
          flex: 1;
          min-width: 250px;
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 4px 8px rgba(0,0,0,0.08);
        }

        .metric-text h6 {
          margin: 0;
          font-size: 0.9rem;
          color: #666;
        }

        .metric-text h3 {
          margin: 0;
          font-size: 1.6rem;
          font-weight: 700;
          color: #222;
        }

        .icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
        }
        .icon-wrapper.blue { background: #007bff; }
        .icon-wrapper.green { background: #28a745; }

        .chart-card {
          width: 100%;
          height: 350px;
          padding: 12px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .table-card {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .table-scroll-wrapper {
          max-height: 380px;
          overflow-y: auto;
        }

        .table th {
          background: #e0f2ff !important;
          position: sticky;
          top: 0;
        }

        @media (max-width: 768px) {
          .metric-card { min-width: 100%; }
        }
      `}</style>
    </>
  );
}
