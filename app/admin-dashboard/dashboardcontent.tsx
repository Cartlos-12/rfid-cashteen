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

  // Clock state
  const [time, setTime] = useState(new Date());

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
          name: i.item_name,
          sold: Number(i.sold),
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

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sortedItems = [...items].sort((a, b) => b.sold - a.sold);

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
          {/* Clock */}
          <div className="d-flex justify-content-end mb-3">
            <div className="p-2 rounded-4 shadow-sm bg-primary fw-bold">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          {/* Metric Cards - Responsive & Aligned */}
<div className="d-flex flex-wrap justify-content-between gap-3 mb-4 text-dark">
  {cards.map((card) => (
    <div
      key={card.title}
      className="flex-grow-1 flex-shrink-1"
      style={{
        minWidth: '200px', // minimum width per card
        maxWidth: 'calc(20% - 12px)', // evenly divide space for 5 cards minus gap
      }}
    >
      <div
        className={`d-flex align-items-center p-4 rounded-4 shadow-sm ${card.bg}`}
        style={{ minHeight: '130px', transition: 'transform 0.2s' }}
      >
        <div
          className="me-3 d-flex align-items-center justify-content-center rounded-circle"
          style={{ width: '60px', height: '60px' }}
        >
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
      <table className="table table-hover table-striped align-middle mb-0">
        <thead className="table-light text-center">
          <tr style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <th>Student</th>
            <th>Item</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody className=" text-center">
          {transactions.slice(0, 10).map((tx: Transaction) =>
            tx.items.map((it, idx) => (
              <tr key={`${tx.id}-${it.id}`}>
                {/* Only show student and date on the first row of each transaction */}
                {idx === 0 && <td rowSpan={tx.items.length}>{tx.user_name}</td>}
                <td>{it.item_name} (x{it.quantity})</td>
                {idx === 0 && (
                  <td rowSpan={tx.items.length}>{new Date(tx.created_at).toLocaleString()}</td>
                )}
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
