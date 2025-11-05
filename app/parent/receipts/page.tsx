'use client';

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css"; // Added for icons

interface CartItem { id?: number; name: string; price: number | string; quantity: number | string; }
interface ReceiptData { id?: string; customerName: string; total: number | string; items: CartItem[]; date?: string; }
interface Transaction { id: number; user_name: string; total: number; status: string; created_at: string; items?: CartItem[]; }
interface Parent { id: string; name: string; email: string; }

function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const receiptId = data.id || `TX-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}`;
  const formattedDate = data.date || new Date().toLocaleString();

  useEffect(() => {
    // Disable scrolling and navigation on background
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed"; // Prevents any background scrolling or navigation shifts
    document.body.style.width = "100%"; // Ensures no horizontal shift

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const preventScroll = (e: Event) => e.preventDefault(); // Prevent wheel, touch, etc.
    const preventNavigation = (e: Event) => e.preventDefault(); // Prevent popstate, etc.

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("touchmove", preventScroll, { passive: false });
    window.addEventListener("popstate", preventNavigation); // Prevents back/forward navigation

    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("wheel", preventScroll);
      document.removeEventListener("touchmove", preventScroll);
      window.removeEventListener("popstate", preventNavigation);
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose(); // Close on backdrop click
  };

  const handlePrint = () => window.print();

  return (
    <>
      <div className="modal-backdrop fade show" onClick={handleBackdropClick}></div>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-labelledby="receiptModalLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-responsive" role="document">
          <div className="modal-content p-3 p-md-4 rounded-3 shadow-lg receipt-paper">
            <div className="text-center mb-3 mb-md-4">
              <h5 id="receiptModalLabel" className="fw-bold mt-2 text-primary">Cashteen Invoice</h5>
              <small className="text-muted d-block">479 Magsaysay Avenue 4700, Sorsogon</small>
              <small className="text-muted mt-1 d-block">Thank you for your purchase!</small>
            </div>

            <div className="border-top border-bottom py-2 py-md-3 my-3 bg-light rounded">
              <p className="mb-1 mb-md-2"><strong>Receipt ID:</strong> {receiptId}</p>
              <p className="mb-1 mb-md-2"><strong>Customer Name:</strong> {data.customerName}</p>
              <p className="mb-0"><strong>Date:</strong> {formattedDate}</p>
            </div>

            <div className="table-responsive" style={{ maxHeight: "250px", overflowY: "auto" }}>
              <table className="table table-borderless table-sm mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Price</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length ? (
                    data.items.map((item, index) => {
                      const price = Number(item.price) || 0;
                      const quantity = Number(item.quantity) || 0;
                      const total = price * quantity;
                      return (
                        <tr key={`${item.id ?? index}-${item.name}`}>
                          <td>{item.name}</td>
                          <td className="text-center">{quantity}</td>
                          <td className="text-end">₱{price.toFixed(2)}</td>
                          <td className="text-end">₱{total.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">No items found</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3} className="text-end border-top border-dark pt-2 pt-md-3 fw-bold">TOTAL</th>
                    <th className="text-end border-top border-dark pt-2 pt-md-3 fw-bold">₱{Number(data.total).toFixed(2)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="text-center mt-3 mt-md-4">
              <small className="text-muted d-block">--- This serves as your Invoice ---</small>
              <small className="text-muted">Please visit again! 😊</small>
            </div>

            <div className="modal-footer d-flex gap-2 mt-3 mt-md-4 border-0">
              <button type="button" className="btn btn-outline-secondary flex-fill" onClick={onClose}>
                <i className="bi bi-x-circle me-1"></i>Close
              </button>
              <button type="button" className="btn btn-success flex-fill" onClick={handlePrint}>
                <i className="bi bi-printer me-1"></i>Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ReceiptsPage() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchParent() {
      try {
        const res = await fetch("/parent/api/auth/me");
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Not logged in");
        setParent(data.data);
      } catch (err: any) {
        console.error("No logged-in parent:", err.message);
        setParent(null);
      } finally {
        setLoading(false);
      }
    }
    fetchParent();
  }, []);

  useEffect(() => {
    if (!parent?.id) return;
    async function fetchTransactions() {
      setLoading(true);
      try {
        const res = await fetch("/parent/api/receipts?page=1", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const data: Transaction[] = await res.json();
        setTransactions(
          data.map((tx) => ({
            ...tx,
            total: Number(tx.total) || 0,
            items: Array.isArray(tx.items) ? tx.items : [],
          }))
        );
      } catch (err) {
        console.error(err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTransactions();
  }, [parent]);

  const openReceipt = (tx: Transaction) => {
    setSelectedReceipt({
      id: tx.id.toString(),
      customerName: tx.user_name,
      total: tx.total,
      items: tx.items || [],
      date: tx.created_at,
    });
  };

  return (
    <div className="container py-4">
      <h3 className="fw-bold mb-4 text-dark">Invoice Purchase</h3>

      {/* Desktop Table */}
      <div className="d-none d-md-block">
        <div className="table-responsive shadow-sm border rounded" style={{ maxHeight: "500px", overflowY: "auto" }}>
          <table className="table table-hover table-striped align-middle mb-0">
            <thead className="table-primary sticky-top shadow-sm">
              <tr>
                <th>Customer</th>
                <th>Date</th>
                <th className="text-end">Total</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="align-middle">
                    <td><div className="skeleton skeleton-text"></div></td>
                    <td><div className="skeleton skeleton-text-sm"></div></td>
                    <td className="text-end"><div className="skeleton skeleton-text-xs"></div></td>
                    <td className="text-center"><div className="skeleton skeleton-btn mx-auto"></div></td>
                  </tr>
                ))
              ) : transactions.length ? (
                transactions.slice(0, 10).map((tx) => (
                  <tr key={tx.id} className="align-middle">
                    <td>{tx.user_name}</td>
                    <td>{new Date(tx.created_at).toLocaleString()}</td>
                    <td className="text-end">₱{Number(tx.total).toFixed(2)}</td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-primary px-3 py-1" onClick={() => openReceipt(tx)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="d-md-none">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card mb-3 shadow-sm">
              <div className="card-body">
                <div className="skeleton skeleton-title mb-2"></div>
                <div className="skeleton skeleton-text-sm mb-1"></div>
                <div className="skeleton skeleton-text-xs mb-3"></div>
                <div className="skeleton skeleton-btn"></div>
              </div>
            </div>
          ))
        ) : transactions.length ? (
          transactions.slice(0, 10).map((tx) => (
            <div key={tx.id} className="card mb-3 shadow-sm">
              <div className="card-body">
                <h6 className="card-title text-dark">{tx.user_name}</h6>
                <p className="card-text mb-1"><strong>Date:</strong> {new Date(tx.created_at).toLocaleString()}</p>
                <p className="card-text mb-3"><strong>Total:</strong> ₱{Number(tx.total).toFixed(2)}</p>
                <button className="btn btn-primary w-100" onClick={() => openReceipt(tx)}>
                  View Receipt
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-5 text-muted">No transactions found.</div>
        )}
      </div>

      {selectedReceipt && (
        <ReceiptModal data={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}

      <style jsx>{`
        :global(body) {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        :global(.table-striped tbody tr:nth-of-type(odd)) {
          background-color: rgba(0, 123, 255, 0.05);
        }
        :global(.table-hover tbody tr:hover) {
          background-color: rgba(0, 123, 255, 0.1);
          transition: background-color 0.2s;
        }
        :global(.table th, .table td) {
          vertical-align: middle;
          padding: 0.75rem;
        }
        :global(.receipt-paper) {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border: 1px solid #dee2e6;
        }
        :global(.skeleton) {
          background-color: #e0e0e0;
          border-radius: 4px;
          animation: pulse 1.2s infinite ease-in-out;
        }
        :global(.skeleton-text) {
          height: 1.2rem;
          width: 75%;
        }
        :global(.skeleton-text-sm) {
          height: 1rem;
          width: 50%;
        }
        :global(.skeleton-text-xs) {
          height: 0.9rem;
          width: 25%;
        }
        :global(.skeleton-title) {
          height: 1.5rem;
          width: 75%;
        }
        :global(.skeleton-btn) {
          height: 2rem;
          width: 50%;
        }
        :global(.modal-responsive) {
          max-width: 90vw; /* Responsive width */
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @media (min-width: 768px) {
          :global(.modal-responsive) {
            max-width: 450px; /* Even smaller on desktop for a more compact receipt */
          }
        }
        @media (max-width: 767.98px) {
          :global(.modal-dialog) {
            margin: 0.5rem auto; /* Center horizontally on mobile */
            width: 95vw; /* Full width on mobile */
          }
          :global(.modal-content) {
            padding: 1rem; /* Reduce padding on small screens */
          }
          :global(.btn) {
            font-size: 0.9rem;
          }
          :global(.card) {
            border-radius: 0.5rem;
          }
        }
        @media print {
          :global(.modal-backdrop, .modal-footer) {
            display: none !important;
          }
          :global(.modal-content) {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
