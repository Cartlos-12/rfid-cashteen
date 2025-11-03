'use client';
import { useEffect, useState } from "react";

interface TransactionItem {
  id: number;
  item_name: string;
  quantity: number;
  price: number;
  status: string; // 'void' for permanently blocked items
}

interface Transaction {
  id: number;
  user_id: number;
  user_name: string;
  total: number;
  status: string;
  created_at: string;
  items: TransactionItem[];
}

export default function CashierTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [voidModal, setVoidModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TransactionItem | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (selectedTx) {
      const latestTx = transactions.find(tx => tx.id === selectedTx.id);
      if (latestTx) setSelectedTx({ ...latestTx });
    }
  }, [transactions]);

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
    const latestTx = transactions.find(t => t.id === tx.id);
    setSelectedTx(latestTx ? { ...latestTx } : tx);
    setModalOpen(true);
  }

  function openVoidModal(item: TransactionItem) {
    if (item.status === "void") return; // already permanently blocked
    setSelectedItem(item);
    setVoidReason("");
    setVoidModal(true);
  }

  function getCombinedItems(items: TransactionItem[]) {
    const map = new Map<string, TransactionItem>();
    for (const it of items) {
      const key = it.item_name + "_" + it.price;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantity += it.quantity;
        if (it.status === "void") existing.status = "void";
      } else {
        map.set(key, { ...it });
      }
    }
    return Array.from(map.values());
  }

  async function handleVoid() {
    if (!selectedTx || !selectedItem) return;
    setVoiding(true);

    try {
      const amount = selectedItem.price * selectedItem.quantity;

      const res = await fetch("/api/transactions/void", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: selectedTx.id,
          item_id: selectedItem.id,
          quantity: selectedItem.quantity,
          amount,
          reason: voidReason || null,
          user_id: selectedTx.user_id,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to void item");

      // Refetch the latest transactions from backend to ensure permanent void persists
      await fetchTransactions();

      setVoidModal(false);
      setRefundModal(true);
      setSelectedItem(null);

      // Close transaction modal to instantly reflect changes
      setModalOpen(false);

    } catch (err: any) {
      console.error("Error voiding item:", err);
      alert(err.message || "Failed to void item. Please try again.");
    } finally {
      setVoiding(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="fw-bold text-dark mb-4">Transactions</h1>
      
      <div className="card shadow-sm mb-3">
        <div className="card-body p-3" style={{ height: "540px", overflowY: "auto" }}>
          {loading ? (
            <p className="text-center py-5">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center py-5 text-muted">No recent transactions found.</p>
          ) : (
            <table className="table table-striped table-hover align-middle mb-0">
              <thead className="table-secondary">
                <tr>
                  <th>Student</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td>{tx.user_name ?? "-"}</td>
                    <td>{tx.items?.length ?? 0} item{(tx.items?.length ?? 0) !== 1 ? "s" : ""}</td>
                    <td>₱{Number(tx.total ?? 0).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${tx.status === "void" ? "bg-danger" : "bg-success"}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td>{new Date(tx.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => openItems(tx)}
                      >
                        View Items
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Transaction Items Modal */}
      {modalOpen && selectedTx && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "600px" }}>
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header bg-primary text-white rounded-top-4">
                <h5 className="modal-title">
                  Transaction #{selectedTx.id} — {selectedTx.user_name}
                </h5>
              </div>
              <div className="modal-body">
                <p><strong>Date:</strong> {new Date(selectedTx.created_at).toLocaleString()}</p>
                <p><strong>Total:</strong> ₱{Number(selectedTx.total ?? 0).toFixed(2)}</p>
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  <table className="table table-hover table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCombinedItems(selectedTx.items).map(it => {
                        const isVoided = it.status === "void";
                        return (
                          <tr key={it.id} className={isVoided ? "table-danger text-decoration-line-through" : ""}>
                            <td>{it.item_name}</td>
                            <td>{it.quantity}</td>
                            <td>₱{Number(it.price).toFixed(2)}</td>
                            <td>₱{(Number(it.price) * Number(it.quantity)).toFixed(2)}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => openVoidModal(it)}
                                disabled={isVoided || voiding} // disabled permanently
                              >
                                {isVoided ? "Voided" : voiding && selectedItem?.id === it.id ? "Voiding..." : "Void"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
{voidModal && selectedItem && (
  <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content border-0 rounded-4">
        <div className="modal-header bg-danger text-white rounded-top-4">
          <h5 className="modal-title">Confirm Void</h5>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to void <strong>{selectedItem.item_name}</strong>?</p>

          {/* Quantity input for partial void */}
          <div className="mb-3">
            <label className="form-label">Quantity to Void</label>
            <input
              type="number"
              className="form-control"
              min={1}
              max={selectedItem.quantity}
              value={selectedItem.quantity}
              onChange={(e) =>
                setSelectedItem({
                  ...selectedItem,
                  quantity: Math.min(Math.max(1, Number(e.target.value)), selectedItem.quantity),
                })
              }
            />
            <small className="text-muted">Max: {selectedItem.quantity}</small>
          </div>

          {/* Live amount update */}
          <p>Amount: ₱{(selectedItem.price * selectedItem.quantity).toFixed(2)}</p>

          <div className="mt-3">
            <label className="form-label">Reason (optional)</label>
            <textarea
              className="form-control"
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            ></textarea>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setVoidModal(false)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleVoid} disabled={voiding}>
            {voiding ? "Voiding..." : "Confirm Void"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}


      {/* Refund Confirmation Modal */}
      {refundModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4">
              <div className="modal-header bg-success text-white rounded-top-4">
                <h5 className="modal-title">Refund Successful</h5>
              </div>
              <div className="modal-body text-center py-4">
                <p className="fs-5 text-success mb-0">
                  The voided amount has been refunded to the user’s balance.
                </p>
              </div>
              <div className="modal-footer justify-content-center">
                <button
                  className="btn btn-success px-4"
                  onClick={() => setRefundModal(false)}
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
