'use client';

import { useEffect, useState } from "react";

interface TransactionItem {
  id: number;
  item_name: string;
  quantity: number;
  price: number;
  voided?: boolean;
}

interface Transaction {
  id: number;
  user_id: number;
  user_name: string;
  total: number | string;
  created_at: string;
  items: TransactionItem[];
}

export default function CashierTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<TransactionItem | null>(null);

  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    setLoading(true);
    try {
      const res = await fetch("/api/transactions");
      const data = await res.json();
      if (Array.isArray(data)) setTransactions(data);
      else setTransactions([]);
    } catch (err) {
      console.error("Failed to load transactions", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  function openItems(tx: Transaction) {
    setSelectedTx(tx);
    setModalOpen(true);
  }

  function handleVoid(item: TransactionItem) {
    if (!selectedTx || item.voided) return;
    setPendingItem(item);
    setVoidModalOpen(true);
  }

  async function confirmVoid() {
    if (!selectedTx || !pendingItem) return;
    try {
      setVoiding(true);
      const res = await fetch("/api/transactions/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: selectedTx.id,
          itemId: pendingItem.id,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        await fetchTransactions();
        const updated = (await (await fetch("/api/transactions")).json()).find((t: Transaction) => t.id === selectedTx.id) || null;
        setSelectedTx(updated);
        setResultMessage(`${result.message} (Refund ₱${Number(result.refund ?? 0).toFixed(2)})`);
      } else {
        setResultMessage(result.error || "Void failed");
      }
      setResultModalOpen(true);
    } catch (err) {
      console.error("Void failed", err);
      setResultMessage("Void request failed.");
      setResultModalOpen(true);
    } finally {
      setVoiding(false);
      setVoidModalOpen(false);
      setPendingItem(null);
    }
  }

  return (
    <div className="p-4">
      <header className="py-3 px-3 border-bottom bg-light shadow-sm mb-3">
        <h1 className="fw-bold text-primary mb-0">Transactions</h1>
      </header>

      <div className="card shadow-sm">
        <div className="card-body p-3" style={{ height: '540px', overflowY: 'auto' }}>
          {loading ? (
            <p className="text-center py-5">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center py-5 text-muted">No recent transactions found.</p>
          ) : (
            <table className="table table-striped table-hover align-middle mb-0">
              <thead className="table-primary">
                <tr>
                  <th>ID</th>
                  <th>Student</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map(tx => (
                  <tr key={tx.id}>
                    <td className="fw-bold">#{tx.id}</td>
                    <td>{tx.user_name ?? "-"}</td>
                    <td>{tx.items?.length ?? 0} item{(tx.items?.length ?? 0) !== 1 ? "s" : ""}</td>
                    <td>₱{Number(tx.total ?? 0).toFixed(2)}</td>
                    <td>{tx.created_at ? new Date(tx.created_at).toLocaleString() : "-"}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-primary" onClick={() => openItems(tx)}>View Items</button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => alert("Open transaction details / print")}>More</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Items Modal */}
      {modalOpen && selectedTx && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '580px' }}>
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header bg-primary text-white rounded-top-4">
                <h5 className="modal-title">Transaction #{selectedTx.id} — {selectedTx.user_name}</h5>
                <button className="btn-close btn-close-white" onClick={() => setModalOpen(false)} />
              </div>
              <div className="modal-body">
                <p><strong>Date:</strong> {selectedTx.created_at ? new Date(selectedTx.created_at).toLocaleString() : "-"}</p>
                <p><strong>Total:</strong> ₱{Number(selectedTx.total ?? 0).toFixed(2)}</p>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="table table-hover table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Line Total</th>
                        <th>Void</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTx.items.map(it => (
                        <tr key={it.id} className={it.voided ? "table-danger" : ""}>
                          <td>{it.item_name ?? "-"}</td>
                          <td>{it.quantity ?? 0}</td>
                          <td>₱{Number(it.price ?? 0).toFixed(2)}</td>
                          <td>₱{(Number(it.price ?? 0) * Number(it.quantity ?? 0)).toFixed(2)}</td>
                          <td>
                            {it.voided ? (
                              <span className="badge bg-danger">Voided</span>
                            ) : (
                              <button className="btn btn-sm btn-danger" onClick={() => handleVoid(it)} disabled={voiding}>
                                Void
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {voidModalOpen && pendingItem && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header bg-warning text-dark rounded-top-4">
                <h5 className="modal-title">Confirm Void</h5>
                <button className="btn-close" onClick={() => { setVoidModalOpen(false); setPendingItem(null); }} />
              </div>
              <div className="modal-body">
                <p>Are you sure you want to void <b>{pendingItem.item_name}</b> (qty {pendingItem.quantity})?<br/>
                This will refund <b>₱{(Number(pendingItem.price ?? 0) * Number(pendingItem.quantity ?? 0)).toFixed(2)}</b>.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => { setVoidModalOpen(false); setPendingItem(null); }}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmVoid} disabled={voiding}>
                  {voiding ? "Voiding..." : "Void"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {resultModalOpen && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header bg-success text-white rounded-top-4">
                <h5 className="modal-title">Void Result</h5>
                <button className="btn-close btn-close-white" onClick={() => setResultModalOpen(false)} />
              </div>
              <div className="modal-body">
                <p>{resultMessage}</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={() => setResultModalOpen(false)}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
