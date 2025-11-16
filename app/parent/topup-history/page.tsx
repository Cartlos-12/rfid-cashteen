'use client';

import { useEffect, useState } from 'react';
import React from 'react';
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
  const [animateContent, setAnimateContent] = useState(false);

  const fetchTransactions = async () => {
    setAnimateContent(false);
    try {
      const res = await fetch(
        `/parent/api/topup-history?page=${page}&search=${encodeURIComponent(search)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setTransactions(data.transactions);
        setTotalPages(data.totalPages);
      } else {
        setTransactions([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
      setTransactions([]);
      setTotalPages(1);
    } finally {
      setAnimateContent(true);
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

  // === Group and sort transactions by date outside JSX ===
  const groupedTransactions: { date: string; items: Transaction[] }[] = (() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(tx => {
      const dateOnly = new Date(tx.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' });
      if (!groups[dateOnly]) groups[dateOnly] = [];
      groups[dateOnly].push(tx);
    });

    const todayStr = new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' });
    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === todayStr && b !== todayStr) return -1;
        if (b === todayStr && a !== todayStr) return 1;
        const [aM, aD, aY] = a.split('/').map(Number);
        const [bM, bD, bY] = b.split('/').map(Number);
        return new Date(bY, bM - 1, bD).getTime() - new Date(aY, aM - 1, aD).getTime();
      })
      .map(([date, items]) => ({ date, items }));
  })();

  return (
    <div className="position-relative" style={{ minHeight: '70vh' }}>
      <div className={`transition-container ${animateContent ? 'fade-in-container' : ''}`}>
        {/* Header + Search */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 px-2">
          <h3 className="text-dark fw-bold mb-3">Load Money History</h3>
          <div className="position-relative w-100 w-md-auto" style={{ maxWidth: '300px' }}>
            <Search className="position-absolute top-50 translate-middle-y ms-3 text-secondary" />
            <input
              type="text"
              placeholder="Search here"
              value={search}
              onChange={e => { setPage(1); setSearch(e.target.value); }}
              className="form-control ps-5"
            />
          </div>
        </div>

        {/* Table container */}
        <div className="shadow-sm border rounded table-container" style={{ maxHeight: '580px', overflowY: 'auto', backgroundColor: '#fff' }}>
          {/* Desktop Table */}
          <div className="d-none d-sm-block table-responsive">
             <table className="table table-hover mb-0 align-middle" style={{ tableLayout: 'fixed', minWidth: '600px', width: '100%' }}>
              <thead className="table-header position-sticky top-0 shadow-sm">
                <tr className="text-center" style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#cfe2ff' }}>
                  <th className="py-3">Transaction ID</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Wallet</th>
                  <th className="py-3">Date / Time</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-5 text-muted">No transactions found.</td>
                  </tr>
                ) : (
                  <>
                    {groupedTransactions.map(({ date, items }) => (
                      <React.Fragment key={date}>
                        {/* Subtle Date Row */}
                        <tr>
                          <td colSpan={4} className="p-0">
                            <div className="d-flex align-items-center" style={{ padding: '8px 0', backgroundColor: '#f8f9fa' }}>
                              <div
                                className="mx-auto px-3 py-1"
                                style={{
                                  backgroundColor: '#e9ecef',
                                  borderRadius: '20px',
                                  fontSize: '0.85rem',
                                  fontWeight: 500,
                                  color: '#495057',
                                }}
                              >
                                {date}
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Transactions under this date */}
                        {items.map((tx, index) => (
                          <tr
                            key={tx.id}
                            className="align-middle fade-in"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <td className="fw-semibold">{tx.id}</td>
                            <td className="text-success fw-semibold">₱{tx.amount.toFixed(2)}</td>
                            <td>{tx.wallet}</td>
                            <td>{new Date(tx.created_at).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="d-block d-sm-none px-2">
            {filteredTransactions.length ? filteredTransactions.map((tx, index) => (
              <div key={tx.id} className="mobile-card border rounded shadow-sm mb-3 p-3 fade-in" style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#ffffff', animationDelay: `${index * 0.05}s` }}>
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
            )) : (
              <div className="text-center py-5 text-muted">No transactions found</div>
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
      </div>

      <style jsx>{`
        .table-header th { background-color: #cfe2ff; font-weight: 600; color: #0d6efd; }
        table tbody tr:hover { background-color: #d0e4ff; transition: background-color 0.3s; }
        input.form-control { border-radius: 25px; height: 38px; transition: all 0.3s ease; }
        .mobile-card { transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease; }
        .mobile-card:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.1); }

        /* Fade-in animation */
        .fade-in { opacity: 0; animation: fadeInAnimation 0.5s forwards; }
        @keyframes fadeInAnimation { to { opacity: 1; } }

        /* Fade-in for entire content */
        .transition-container { opacity: 0; transition: opacity 0.5s ease; }
        .fade-in-container { opacity: 1; }

        @media (max-width: 576px) {
          .table-container { margin-left: 0 !important; margin-right: 0 !important; }
          table thead th, table tbody td { font-size: 0.85rem; padding: 0.5rem; }
          input.form-control { height: 40px; }
        }
      `}</style>
    </div>
  );
}
