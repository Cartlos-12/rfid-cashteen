'use client';

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

interface CartItem { id?: number; name: string; price: number | string; quantity: number | string; }
interface ReceiptData { id?: string; customerName: string; total: number | string; items: CartItem[]; date?: string; }
interface Transaction { id: number; user_name: string; total: number; status: string; created_at: string; items?: CartItem[]; }
interface Parent { id: string; name: string; email: string; }

function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const receiptId = data.id || `TX-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}`;
  const formattedDate = data.date || new Date().toLocaleString();

  useEffect(() => {
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    };
  }, []);

  const handlePrint = () => window.print();

  return (
    <>
      <div className="modal-backdrop fade show"></div>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-dialog-centered modal-md" role="document">
          <div className="modal-content p-3">
            <div className="text-center mb-3">
              <h5 className="fw-bold mt-2">Cashteen E-receipt</h5>
              <small className="text-muted d-block">479 Magsaysay Avenue 4700, Sorsogon</small>
              <small className="text-muted mt-1 d-block">Thank you for your purchase!</small>
            </div>

            <div className="border-top border-bottom py-2 my-2">
              <p className="mb-1"><strong>Receipt ID:</strong> {receiptId}</p>
              <p className="mb-1"><strong>Customer Name:</strong> {data.customerName}</p>
              <p className="mb-0"><strong>Date:</strong> {formattedDate}</p>
            </div>

            <div className="table-responsive" style={{ maxHeight: "300px", overflowY: "auto" }}>
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
                    <th colSpan={3} className="text-end border-top border-dark pt-2">TOTAL</th>
                    <th className="text-end border-top border-dark pt-2">₱{Number(data.total).toFixed(2)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="text-center mt-5">
              <small className="text-muted d-block">--- This serves as your E-receipt ---</small>
              <small className="text-muted">Please visit again! 😊</small>
            </div>

            <div className="modal-footer d-flex gap-2 mt-3">
              <button type="button" className="btn btn-secondary flex-fill" onClick={onClose}>Close</button>
              <button type="button" className="btn btn-success flex-fill" onClick={handlePrint}>Print</button>
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

  if (loading)
    return (
      <div className="container py-4">
        <div className="alert alert-info">Loading...</div>
      </div>
    );

  if (!parent)
    return (
      <div className="container py-4">
        <div className="alert alert-danger">You are not logged in.</div>
      </div>
    );

  return (
    <div className="container py-4">
      <h3 className="fw-bold mb-4 text-primary">Transaction Receipts</h3>
      {!transactions.length ? (
        <div className="alert alert-info">
          No transactions found for <strong>{parent.name}</strong>.
        </div>
      ) : (
        <div className="table-responsive" style={{ maxHeight: "500px", overflowY: "auto" }}>
          <table className="table table-hover align-middle">
            <thead className="table-light sticky-top">
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th className="text-end">Total</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>{tx.user_name}</td>
                  <td>{new Date(tx.created_at).toLocaleString()}</td>
                  <td className="text-end">₱{Number(tx.total).toFixed(2)}</td>
                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => openReceipt(tx)}
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedReceipt && (
        <ReceiptModal data={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
}
