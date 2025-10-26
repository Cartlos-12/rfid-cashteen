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
  total: number;
  created_at: string;
  items: TransactionItem[];
}

export default function CashierTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [voiding, setVoiding] = useState(false);

  // state for void confirmation modal
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<TransactionItem | null>(null);

  // state for result modal after voiding
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
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  }

  function openItems(tx: Transaction) {
    setSelectedTx(tx);
    setModalOpen(true);
  }

  // open void confirmation modal instead of confirm()
  function handleVoid(item: TransactionItem) {
    if (!selectedTx) return;
    if (item.voided) {
      alert("Item already voided.");
      return;
    }
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
        const fresh = (await (await fetch("/api/transactions")).json()) as Transaction[];
        const updated = fresh.find((t) => t.id === selectedTx.id) || null;
        setSelectedTx(updated);

        // show success modal
        setResultMessage(`${result.message} (Refund ₱${result.refund})`);
        setResultModalOpen(true);
      } else {
        setResultMessage(result.error || "Void failed");
        setResultModalOpen(true);
      }
    } catch (err) {
      console.error("Void failed", err);
      setResultMessage("Void request failed. See console.");
      setResultModalOpen(true);
    } finally {
      setVoiding(false);
      setVoidModalOpen(false);
      setPendingItem(null);
    }
  }

  if (loading) return <p className="p-4">Loading transactions...</p>;

  return (
    <div className="p-4">
      <h2 className="mb-4">Recent Transactions</h2>

      <div className="card shadow-sm">
        <div className="card-body p-3">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Student</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 && (
                  <tr key="no-data">
                    <td colSpan={6} className="text-center text-muted py-4">
                      No recent transactions found.
                    </td>
                  </tr>
                )}
                {transactions.map((tx) => (
                  <tr key={`tx-${tx.id}`}>
                    <td className="fw-bold">#{tx.id}</td>
                    <td>{tx.user_name}</td>
                    <td>{tx.items.length} item{tx.items.length !== 1 ? "s" : ""}</td>
                    <td>₱{Number(tx.total).toFixed(2)}</td>
                    <td>{new Date(tx.created_at).toLocaleString()}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openItems(tx)}
                        >
                          View items
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => alert("Open transaction details / print")}
                        >
                          More
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Items Modal */}
      {modalOpen && selectedTx && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Transaction #{selectedTx.id} — {selectedTx.user_name}</h5>
                <button className="btn-close" onClick={() => setModalOpen(false)} />
              </div>
              <div className="modal-body">
                <p className="mb-2"><strong>Date:</strong> {new Date(selectedTx.created_at).toLocaleString()}</p>
                <p className="mb-3"><strong>Total:</strong> ₱{Number(selectedTx.total).toFixed(2)}</p>

                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Line Total</th>
                      <th>Void</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTx.items.map((it, idx) => (
                      <tr key={`tx-${selectedTx.id}-item-${it.id ?? idx}`} className={it.voided ? "table-danger" : ""}>
                        <td>{it.item_name}</td>
                        <td>{it.quantity}</td>
                        <td>₱{Number(it.price).toFixed(2)}</td>
                        <td>₱{(Number(it.price) * Number(it.quantity)).toFixed(2)}</td>
                        <td>
                          {it.voided ? (
                            <span className="badge bg-danger">Voided</span>
                          ) : (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleVoid(it)}
                              disabled={voiding}
                            >
                              Void
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Close</button>
                <button className="btn btn-primary" onClick={async () => { await fetchTransactions(); alert('Refreshed'); }}>Refresh</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {voidModalOpen && pendingItem && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Void</h5>
                <button className="btn-close" onClick={() => { setVoidModalOpen(false); setPendingItem(null); }} />
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to void <b>{pendingItem.item_name}</b> (qty {pendingItem.quantity})?
                  <br />
                  This will refund <b>₱{(pendingItem.price * pendingItem.quantity).toFixed(2)}</b> to the customer.
                </p>
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

      {/* Result Modal (after voiding) */}
      {resultModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Void Result</h5>
                <button
                  className="btn-close"
                  onClick={() => setResultModalOpen(false)}
                />
              </div>
              <div className="modal-body">
                <p>{resultMessage}</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => setResultModalOpen(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
