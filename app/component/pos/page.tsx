'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReceiptPage, { ReceiptData } from "../../component/receipt/page";

interface Item { id: number; name: string; price: number; category?: string; }
interface CartItem extends Item { quantity: number; }
interface Customer { id: string; name: string; balance: number; }

export default function CashierPOS() {
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [scannedRFID, setScannedRFID] = useState("");
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const router = useRouter();

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      const res = await fetch("/api/cashier/items");
      const data = await res.json();
      setItems((data.items || []).map((item: any) => ({ ...item, price: Number(item.price) })));
    };
    fetchItems();
  }, []);

  // User action logger
  async function logUserAction(action: string, details?: string) {
    try {
      await fetch("/api/admin/user-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: customer?.id || "unknown",
          userName: customer?.name || "unknown",
          role: "cashier",
          action,
          details,
        }),
      });
    } catch (err) {
      console.error("Failed to log user action:", err);
    }
  }

  // Get unique categories
  const categories = ["All", ...Array.from(new Set(items.map(item => item.category).filter(Boolean)))];

  // Filter items based on search and category
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart management
  const addToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        const newQuantity = existing.quantity + 1;
        logUserAction("Add to Cart", `Added ${item.name} (now x${newQuantity})`);
        return prev.map(i => i.id === item.id ? { ...i, quantity: newQuantity } : i);
      } else {
        logUserAction("Add to Cart", `Added ${item.name} x1`);
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const decreaseQuantity = (id: number) =>
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));

  const removeFromCart = (id: number) =>
    setCart(prev => prev.filter(i => i.id !== id));

  const getTotal = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // RFID listener
  useEffect(() => {
    let buffer = "";
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        buffer += e.key;
        setScannedRFID(buffer);
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => { buffer = ""; setScannedRFID(""); }, 100);
      } else if (e.key === "Enter") {
        if (buffer.length) fetchCustomer(buffer);
        buffer = "";
        setScannedRFID("");
        if (timeout) clearTimeout(timeout);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch customer data
  const fetchCustomer = async (rfidTag: string) => {
    try {
      const res = await fetch(`/api/rfid/scan?rfid=${rfidTag}`);
      const data = await res.json();
      if (res.ok) {
        setCustomer({ ...data.customer, balance: Number(data.customer.balance) });
        setShowScanModal(false);
        setShowPaymentModal(true);
      } else {
        setErrorMessage(data.error || "RFID not found");
        setShowErrorModal(true);
        setCustomer(null);
      }
    } catch (err) {
      console.error("RFID fetch failed", err);
      setErrorMessage("Failed to fetch customer data");
      setShowErrorModal(true);
    }
  };

  // Checkout logic
  const handleCheckoutClick = () => {
    if (!customer) setShowScanModal(true);
    else setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    if (!customer) return;
    const total = getTotal();
    if (customer.balance < total) {
      setErrorMessage("❌ Insufficient balance!");
      setShowErrorModal(true);
      return;
    }

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, cart, total }),
      });

      const data = await res.json();

      if (res.ok) {
        await fetch("/api/print", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: data.id, customerName: customer.name, total, items: cart }),
        });

        await logUserAction("Payment Confirmed", `Transaction ID: ${data.id}, Total: ₱${total.toFixed(2)}`);

        setReceiptData({ id: data.id, customerName: customer.name, total, items: cart, date: data.date });
        setShowPaymentModal(false);
        setShowReceiptModal(true);
        setCart([]);
        setCustomer(null);
      } else {
        setErrorMessage(data.error || "Payment failed");
        setShowErrorModal(true);
      }
    } catch (err) {
      console.error("Checkout failed", err);
      setErrorMessage("Unexpected error occurred during checkout");
      setShowErrorModal(true);
    }
  };

  return (
    <div className="d-flex vh-100 relative">
      {/* Items List */}
      <div className="w-50 p-4 border-end bg-light overflow-auto">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Available Items</h2>
          <button className="btn btn-success btn-sm">+ Add Item</button>
        </div>
        <div className="d-flex gap-2 mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <ul className="list-group">
          {filteredItems.map(item => (
            <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{item.name}</strong>
                {item.category && <><br /><span className="badge bg-primary">{item.category}</span></>}
                <br />₱{item.price.toFixed(2)}
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => addToCart(item)}>Add</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Cart */}
      <div className="w-50 p-4 bg-white d-flex flex-column">
        <h2 className="mb-4">Cart</h2>
        {cart.length === 0 ? <p>No items in cart</p> :
          <ul className="list-group flex-grow-1">
            {cart.map(item => (
              <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                <div>{item.name}</div>
                <div className="d-flex align-items-center">
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => decreaseQuantity(item.id)}>-</button>
                  <span className="mx-2">{item.quantity}</span>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => addToCart(item)}>+</button>
                  <span className="ms-3">₱{(item.price * item.quantity).toFixed(2)}</span>
                  <button className="btn btn-danger btn-sm ms-3" onClick={() => removeFromCart(item.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        }
        <div className="mt-auto border-top pt-3 bg-white" style={{ position: "sticky", bottom: 0 }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-bold">Total:</h5>
            <h5 className="mb-0 text-success fw-bold">₱{getTotal().toFixed(2)}</h5>
          </div>
          <button className="btn btn-lg btn-success w-100 shadow-sm" onClick={handleCheckoutClick}>Confirm Order</button>
        </div>
      </div>

      {/* Scan RFID Modal */}
      <div className={`modal fade ${showScanModal ? "show d-block" : ""}`} tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">🔄 Scan Your RFID</h5>
              <button type="button" className="btn-close" onClick={() => setShowScanModal(false)}></button>
            </div>
            <div className="modal-body">
              <p>Please tap your ID card on the reader to proceed.</p>
              <p>Scanned: {scannedRFID}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary w-100" onClick={() => setShowScanModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {customer && (
        <div className={`modal fade ${showPaymentModal ? "show d-block" : ""}`} tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Payment</h5>
                <button type="button" className="btn-close" onClick={() => setShowPaymentModal(false)}></button>
              </div>
              <div className="modal-body">
                <p><strong>ID:</strong> {customer.id}</p>
                <p><strong>Name:</strong> {customer.name}</p>
                <p><strong>Balance:</strong> ₱{customer.balance.toFixed(2)}</p>
                <hr />
                <p><strong>Total Purchase:</strong> ₱{getTotal().toFixed(2)}</p>
              </div>
              <div className="modal-footer d-flex justify-content-between">
                <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={confirmPayment}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <div className={`modal fade ${showReceiptModal ? "show d-block" : ""}`} tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header justify-content-center position-relative">
                <h5 className="modal-title fw-bold">Invoice</h5>
                <button type="button" className="btn-close position-absolute" style={{ right: '1rem' }} onClick={() => setShowReceiptModal(false)}></button>
              </div>
              <div className="modal-body" style={{ fontFamily: 'monospace' }}>
                <div className="text-center mb-3">
                  <h6 className="fw-bold mb-0">Cashteen Payment System</h6>
                  <small>Invoice</small>
                </div>
                <div className="mb-2">
                  <p className="mb-1"><strong>Receipt ID:</strong> {receiptData.id || `TX-${Date.now()}`}</p>
                  <p className="mb-1"><strong>Customer:</strong> {receiptData.customerName}</p>
                  <p className="mb-1">
                    <strong>Date:</strong>{" "}
                    {receiptData.date || new Date().toLocaleString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <hr />
                <div>
                  {receiptData.items.map(i => (
                    <div key={i.id} className="d-flex justify-content-between mb-1">
                      <span>{i.name} x{i.quantity}</span>
                      <span>₱{(i.price * i.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <hr />
                <div className="d-flex justify-content-between fw-bold">
                  <span>Total</span>
                  <span>₱{receiptData.total.toFixed(2)}</span>
                </div>
                <div className="text-center mt-3">
                  <small>Thank you for your purchase!</small>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-success w-100"
                  onClick={async () => {
                    if (!receiptData || !receiptData.items?.length) return;
                    try {
                      const response = await fetch("/api/print", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(receiptData),
                      });
                      const result = await response.json();
                      if (response.ok && result.success) {
                        await logUserAction("Receipt Printed", `Transaction ID: ${receiptData.id}`);
                        alert(result.message);
                      } else {
                        alert(result.error || "Print failed");
                      }
                    } catch (err) {
                      console.error("Print error:", err);
                      alert("Failed to print receipt");
                    }
                  }}
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      <div className={`modal fade ${showErrorModal ? "show d-block" : ""}`} tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title text-danger">⚠️ Error</h5>
              <button type="button" className="btn-close" onClick={() => setShowErrorModal(false)}></button>
            </div>
            <div className="modal-body">
              <p>{errorMessage}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary w-100" onClick={() => setShowErrorModal(false)}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
