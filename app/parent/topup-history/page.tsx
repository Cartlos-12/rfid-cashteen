'use client';

import { useEffect, useState } from 'react';

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

  const handlePrev = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const handleNext = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  return (
    <div className="container">
      {/* Header + Search */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h3 className="text-primary fw-bold mb-0">Top-up Transaction History</h3>
        <input
          type="number"
          placeholder="Search by Transaction ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-control"
          style={{ maxWidth: '250px' }}
        />
      </div>

      {/* Table */}
      <div
        className="table-responsive shadow-sm border rounded"
        style={{ height: '550px', overflowY: 'auto' }}
      >
        <table className="table table-hover table-striped mb-0 align-middle">
          <thead className="table-primary position-sticky top-0">
            <tr className="text-center">
              <th>ID</th>
              <th>RFID</th>
              <th>Email</th>
              <th>Amount (₱)</th>
              <th>Wallet</th>
              <th>Date / Time</th>
            </tr>
          </thead>
          <tbody className="text-center">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-5 text-secondary">
                  Loading…
                </td>
              </tr>
            ) : transactions.length ? (
              transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>{tx.rfid}</td>
                  <td>{tx.email}</td>
                  <td className="text-success fw-semibold">₱{tx.amount.toFixed(2)}</td>
                  <td>{tx.wallet}</td>
                  <td>
                    {new Date(tx.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-5 text-muted">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-4">
          <button
            className="btn btn-primary shadow-sm"
            onClick={handlePrev}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <span className="fw-medium">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-primary shadow-sm"
            onClick={handleNext}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
