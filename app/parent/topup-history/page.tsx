'use client';

import { useEffect, useState } from 'react';
import { Search } from 'react-bootstrap-icons';

type Transaction = {
  id: number;
  rfid: string;
  amount: number;
  wallet: string;
  email: string;
  created_at: string;
};

export default function TransactionHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/parent/api/topup-history?page=${page}&search=${encodeURIComponent(search)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setTransactions(data.transactions);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, search]);

  const handlePrev = () => page > 1 && setPage(p => p - 1);
  const handleNext = () => page < totalPages && setPage(p => p + 1);

  const filteredTransactions = transactions.filter(tx => {
    if (!search) return true;
    const s = search.toLowerCase();
    const date = new Date(tx.created_at);
    const dateStr1 = date.toLocaleDateString('en-PH');
    const dateStr2 = date.toISOString().split('T')[0];
    const dateStr3 = date.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    return (
      tx.id.toString().includes(s) ||
      tx.amount.toString().includes(s) ||
      dateStr1.includes(s) ||
      dateStr2.includes(s) ||
      dateStr3.toLowerCase().includes(s)
    );
  });

  return (
    <>
      {/* Header + Search */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 px-2">
        <h3 className="text-dark fw-bold mb-3">Load Money History</h3>
        <div className="position-relative w-100 w-md-auto" style={{ maxWidth: '300px', marginLeft: '-7px' }}>
          <Search className="position-absolute top-50 translate-middle-y ms-2 text-secondary" />
          <input
            type="text"
            placeholder="Search here"
            value={search}
            onChange={e => { setPage(1); setSearch(e.target.value); }}
            className="form-control ps-5"
          />
        </div>
      </div>

      {/* Table / Cards */}
      <div className="shadow-sm border rounded table-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
        {/* Desktop Table */}
        <div className="d-none d-sm-block table-responsive">
          <table className="table table-hover mb-0 align-middle" style={{ tableLayout: 'fixed', minWidth: '600px', width: '100%' }}>
            <thead className="table-primary position-sticky top-0 shadow-sm">
              <tr className="text-center">
                <th className="py-2">Transaction ID</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Wallet</th>
                <th className="py-2">Date / Time</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="align-middle">
                    <td><div className="skeleton skeleton-text-sm"></div></td>
                    <td><div className="skeleton skeleton-text-xs"></div></td>
                    <td><div className="skeleton skeleton-text"></div></td>
                    <td><div className="skeleton skeleton-text-lg"></div></td>
                  </tr>
                ))
              ) : filteredTransactions.length ? (
                filteredTransactions.map(tx => (
                  <tr key={tx.id} className="align-middle fade-in">
                    <td className="fw-semibold">{tx.id}</td>
                    <td className="text-success fw-semibold">₱{tx.amount.toFixed(2)}</td>
                    <td>{tx.wallet}</td>
                    <td>{new Date(tx.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-5 text-muted">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="d-block d-sm-none px-0">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`border rounded shadow-sm mb-3 p-3 bg-white mobile-card`}
                style={{ backgroundColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff' }}
              >
                <div className="d-flex justify-content-between mb-1">
                  <span className="fw-semibold">ID:</span>
                  <div className="skeleton skeleton-text-xs"></div>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="fw-semibold">Amount:</span>
                  <div className="skeleton skeleton-text-xs"></div>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="fw-semibold">Wallet:</span>
                  <div className="skeleton skeleton-text"></div>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="fw-semibold">Date:</span>
                  <div className="skeleton skeleton-text-lg"></div>
                </div>
              </div>
            ))
          ) : filteredTransactions.length ? (
            filteredTransactions.map((tx, index) => (
              <div
                key={tx.id}
                className={`border rounded shadow-sm mb-3 p-3 bg-white mobile-card fade-in`}
                style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#ffffff' }}
              >
                <div className="d-flex justify-content-between mb-1">
                  <span className="fw-semibold">ID:</span>
                  <span>{tx.id}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="fw-semibold">Amount:</span>
                  <span className="text-success fw-semibold">₱{tx.amount.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="fw-semibold">Wallet:</span>
                  <span>{tx.wallet}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="fw-semibold">Date:</span>
                  <span>{new Date(tx.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-5 text-muted">No transactions found.</div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-4 gap-2 px-2">
          <button className="btn btn-primary rounded-pill shadow-sm w-100 w-sm-auto" onClick={handlePrev} disabled={page === 1}>← Previous</button>
          <span className="fw-medium">Page {page} of {totalPages}</span>
          <button className="btn btn-primary rounded-pill shadow-sm w-100 w-sm-auto" onClick={handleNext} disabled={page === totalPages}>Next →</button>
        </div>
      )}

      <style jsx>{`
        table th {
          background-color: #cfe2ff;
        }
        table tbody tr:hover {
          background-color: #d0e4ff;
        }
        input.form-control {
          border-radius: 25px;
          height: 38px;
          transition: all 0.3s ease;
        }
        .mobile-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .mobile-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(0,0,0,0.1);
        }
        /* Fade-in animation */
        .fade-in {
          opacity: 0;
          animation: fadeInAnimation 0.5s forwards;
        }
        @keyframes fadeInAnimation {
          to { opacity: 1; }
        }
        /* Skeleton styles */
        .skeleton {
          background-color: #e0e0e0;
          border-radius: 4px;
          animation: pulse 1.2s infinite ease-in-out;
        }
        .skeleton-text {
          height: 1.2rem;
          width: 75%;
        }
        .skeleton-text-sm {
          height: 1rem;
          width: 50%;
        }
        .skeleton-text-xs {
          height: 0.9rem;
          width: 25%;
        }
        .skeleton-text-lg {
          height: 1.2rem;
          width: 90%;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        /* Remove horizontal margins on mobile */
        @media (max-width: 576px) {
          .table-container {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          table thead th, table tbody td {
            font-size: 0.85rem;
            padding: 0.5rem;
          }
          input.form-control {
            height: 40px;
          }
        }
      `}</style>
    </>
  );
}
