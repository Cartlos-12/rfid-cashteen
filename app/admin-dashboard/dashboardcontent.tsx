'use client';

import { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { PeopleFill, CardChecklist, CashCoin, ExclamationTriangle } from 'react-bootstrap-icons';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

type ItemData = { name: string; sold: number };
type Metrics = {
  totalUsers: number;
  activeUsersToday: number;
  totalTransactions: number;
  revenueToday: number;
  lowBalanceUsers: number;
};
type Transaction = {
  id: number;
  user_name: string;
  items: { id: number; item_name: string; quantity: number; voided: boolean }[];
  created_at: string;
};

export default function DashboardContent() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalUsers: 0,
    activeUsersToday: 0,
    totalTransactions: 0,
    revenueToday: 0,
    lowBalanceUsers: 0,
  });
  const [items, setItems] = useState<ItemData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const metricsRes = await fetch('/api/admin/dashboard-metrics');
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);

        const itemsRes = await fetch('/api/admin/popular-items');
        const itemsData = await itemsRes.json();
        const mappedItems: ItemData[] = (itemsData.items || []).map((i: any) => ({
        name: i.item_name, // rename item_name to name
          sold: Number(i.sold)
        }));
        setItems(mappedItems);

        const txRes = await fetch('/api/transactions');
        const txData = await txRes.json();
        setTransactions(txData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Sort items descending by sold just in case
  const sortedItems = [...items].sort((a, b) => b.sold - a.sold);

  // Chart data
  const barData = {
    labels: sortedItems.map((i) => i.name),
    datasets: [
      {
        label: 'Items Sold',
        data: sortedItems.map((i) => i.sold),
        backgroundColor: 'rgba(13, 110, 253, 0.7)',
        borderRadius: 6,
      },
    ],
  };

  const pieData = {
    labels: sortedItems.map((i) => i.name),
    datasets: [
      {
        label: 'Popularity',
        data: sortedItems.map((i) => i.sold),
        backgroundColor: [
          '#0d6efd',
          '#6f42c1',
          '#198754',
          '#fd7e14',
          '#dc3545',
          '#20c997',
          '#ffc107',
        ],
        borderWidth: 1,
      },
    ],
  };

  const cards = [
    { title: 'Total Users', value: metrics.totalUsers, icon: <PeopleFill size={28} className="text-primary" />, bg: 'bg-primary bg-opacity-10' },
    { title: 'Active Today', value: metrics.activeUsersToday, icon: <CardChecklist size={28} className="text-success" />, bg: 'bg-success bg-opacity-10' },
    { title: 'Transactions', value: metrics.totalTransactions, icon: <CashCoin size={28} className="text-warning" />, bg: 'bg-warning bg-opacity-10' },
    { title: 'Revenue Today', value: `₱${metrics.revenueToday.toLocaleString()}`, icon: <CashCoin size={28} className="text-info" />, bg: 'bg-info bg-opacity-10' },
    { title: 'Low Balance Alerts', value: metrics.lowBalanceUsers, icon: <ExclamationTriangle size={28} className="text-danger" />, bg: 'bg-danger bg-opacity-10' },
  ];

  return (
    <div className="container-fluid py-4">
      {loading ? (
        <p className="text-center text-muted py-5">Loading dashboard...</p>
      ) : (
        <>
          {/* --- METRIC CARDS --- */}
          <div className="d-flex flex-wrap text-black justify-content-start gap-3 mb-4">
            {cards.map((card) => (
              <div key={card.title} className="flex-grow-1 flex-shrink-1" style={{ minWidth: '220px', maxWidth: '250px' }}>
                <div className={`d-flex align-items-center p-4 rounded-4 shadow-sm ${card.bg}`} style={{ minHeight: '130px', transition: 'transform 0.2s' }}>
                  <div className="me-3 d-flex align-items-center justify-content-center rounded-circle" style={{ width: '60px', height: '60px' }}>
                    {card.icon}
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1 fw-semibold text-muted">{card.title}</h6>
                    <p className="mb-0 fw-bold fs-5">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* --- CHARTS SECTION --- */}
          <div className="row mb-0 gx-4">
            <div className="col-lg-8 mb-4">
              <div className="card shadow-sm p-3 h-100">
                <h5 className="card-title fw-semibold mb-3">Most Purchased Items</h5>
                {items.length > 0 ? (
                  <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                ) : (
                  <p className="text-center text-muted py-5">No sales data yet.</p>
                )}
              </div>
            </div>

            <div className="col-lg-4 mb-4">
              <div className="card shadow-sm p-3 h-100">
                <h5 className="card-title fw-semibold mb-3">Item Popularity</h5>
                {items.length > 0 ? (
                  <Pie data={pieData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                ) : (
                  <p className="text-center text-muted py-5">No item data yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* --- RECENT TRANSACTIONS --- */}
<div className="card shadow-sm p-3 mb-4">
  <h5 className="card-title fw-semibold mb-3">Recent Transactions</h5>
  {transactions.length === 0 ? (
    <p className="text-center text-muted py-4">No recent transactions found.</p>
  ) : (
    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
      <table className="table table-hover align-middle">
        <thead className="table-light">
          <tr style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8f9fa' }}>
            <th>Student</th>
            <th>Item</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions
            .slice(0, 10) // Limit to 10 recent transactions
            .map((tx: Transaction) =>
              tx.items.map((it, idx) => (
                <tr key={`${tx.id}-${it.id}`}>
                  {idx === 0 && (
                    <>
                      <td rowSpan={tx.items.length}>{tx.user_name}</td>
                    </>
                  )}
                  <td>{it.item_name} (x{it.quantity})</td>
                  {idx === 0 && (
                    <td rowSpan={tx.items.length}>{new Date(tx.created_at).toLocaleString()}</td>
                  )}
                  <td>
                    <span className={`badge ${it.voided ? 'bg-danger' : 'bg-success'}`}>
                      {it.voided ? 'Voided' : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))
            )}
        </tbody>
      </table>
    </div>
  )}
</div>

        </>
      )}
    </div>
  );
}
