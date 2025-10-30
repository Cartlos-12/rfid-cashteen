'use client';

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface TransactionItem {
  id: number;
  item_name: string;
  quantity: number;
  price: number;
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

  function saveAllTransactionsToExcel() {
    const wsData: (string | number)[][] = [
      ["Transaction ID", "Student", "Date", "Item", "Quantity", "Price", "Line Total", "Status"]
    ];

    let grandTotal = 0;

    transactions.forEach(tx => {
      (tx.items ?? []).forEach(item => {
        const lineTotal = item.price * item.quantity;
        wsData.push([
          tx.id,
          tx.user_name ?? "-",
          new Date(tx.created_at).toLocaleString(),
          item.item_name ?? "-",
          item.quantity,
          item.price,
          lineTotal,
          tx.status ?? "completed"
        ]);
      });
      grandTotal += Number(tx.total ?? 0);
      wsData.push([]); // blank line after each transaction
    });

    wsData.push([]);
    wsData.push(["Overall Total", "", "", "", "", "", grandTotal.toFixed(2)]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "All_Transactions.xlsx");
  }

  return (
    <div className="p-4">
      <header className="py-3 px-3 border-bottom bg-light shadow-sm mb-3">
        <h1 className="fw-bold text-primary mb-0">Transactions</h1>
      </header>

      <div className="card shadow-sm mb-3">
        <div className="card-body p-3" style={{ height: "540px", overflowY: "auto" }}>
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
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="fw-bold">#{tx.id}</td>
                    <td>{tx.user_name ?? "-"}</td>
                    <td>{tx.items?.length ?? 0} item{(tx.items?.length ?? 0) !== 1 ? "s" : ""}</td>
                    <td>₱{Number(tx.total ?? 0).toFixed(2)}</td>
                    <td>
                      <span
                        className={`badge ${
                          tx.status === "void" ? "bg-danger" : "bg-success"
                        }`}
                      >
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

      {/* Save to Excel Button Outside Table */}
      <div className="d-flex justify-content-end mb-4">
        <button className="btn btn-success" onClick={saveAllTransactionsToExcel}>
          Save All to Excel
        </button>
      </div>

      {/* View Items Modal */}
      {modalOpen && selectedTx && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "580px" }}>
            <div className="modal-content shadow-lg border-0 rounded-4">
              <div className="modal-header bg-primary text-white rounded-top-4">
                <h5 className="modal-title">
                  Transaction #{selectedTx.id} — {selectedTx.user_name}
                </h5>
              </div>
              <div className="modal-body">
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(selectedTx.created_at).toLocaleString()}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`badge ${
                      selectedTx.status === "void" ? "bg-danger" : "bg-success"
                    }`}
                  >
                    {selectedTx.status}
                  </span>
                </p>
                <p>
                  <strong>Total:</strong> ₱
                  {Number(selectedTx.total ?? 0).toFixed(2)}
                </p>

                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  <table className="table table-hover table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTx.items.map(it => (
                        <tr key={it.id}>
                          <td>{it.item_name}</td>
                          <td>{it.quantity}</td>
                          <td>₱{Number(it.price).toFixed(2)}</td>
                          <td>
                            ₱{(Number(it.price) * Number(it.quantity)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
