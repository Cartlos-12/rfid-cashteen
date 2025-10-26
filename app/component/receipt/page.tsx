'use client';
import React, { useEffect } from "react";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptData {
  id?: string;
  customerName: string;
  total: number;
  items: CartItem[];
  date?: string;
}

interface Props {
  data: ReceiptData;
  onClose: () => void;
}

export default function ReceiptPage({ data, onClose }: Props) {
  // Generate fallback Receipt ID and Date
  const receiptId =
    data.id ||
    `TX-${new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, "")
      .slice(0, 14)}`;

  const formattedDate =
    data.date ||
    new Date().toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  // Auto show modal when mounted
  useEffect(() => {
    const modalEl = document.getElementById("receiptModal");
    if (modalEl) {
      const bootstrap = require("bootstrap/dist/js/bootstrap.bundle.min.js");
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
      modalEl.addEventListener("hidden.bs.modal", onClose);
    }
  }, [onClose]);

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="modal fade"
      id="receiptModal"
      tabIndex={-1}
      aria-labelledby="receiptModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fw-bold" id="receiptModalLabel">
              Transaction Receipt
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body">
            <p>
              <strong>Receipt ID:</strong> {receiptId}
            </p>
            <p>
              <strong>Customer Name:</strong> {data.customerName}
            </p>
            <p>
              <strong>Date:</strong> {formattedDate}
            </p>

            <table className="table table-bordered mt-3">
              <thead className="table-light">
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th className="text-end">Price</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td className="text-end">
                      ₱{item.price.toFixed(2)}
                    </td>
                    <td className="text-end">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3} className="text-end">
                    Total:
                  </th>
                  <th className="text-end">₱{data.total.toFixed(2)}</th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="modal-footer d-flex gap-2">
            <button
              type="button"
              className="btn btn-secondary flex-fill"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-success flex-fill"
              onClick={handlePrint}
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
