'use client';

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReceiptPage, { ReceiptData } from "../../component/receipt/page";

// Dummy function to simulate system logging
const logSystemAccess = (user: string, action: string, details: string) => {
  console.log(`[SYSTEM LOG] User: ${user}, Action: ${action}, Details: ${details}`);
};

export default function CashierPOS() {
  const router = useRouter();
  const currentUser = "cashier"; // Replace with actual logged-in user logic

  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addCategory, setAddCategory] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // RFID states
  const [showRFIDModal, setShowRFIDModal] = useState(false);
  const [scanningRFID, setScanningRFID] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [rfidBufferDisplay, setRfidBufferDisplay] = useState("");

  const rfidRef = useRef("");
  const rfidTimeoutRef = useRef(null);

  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);
  const [showInvalidModal, setShowInvalidModal] = useState(false);

  // Add item modals states
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Receipt modal state
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Fetch items on mount
  useEffect(() => {
    let mounted = true;
    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetch("/api/cashier/items");
        const data = await res.json();
        if (!mounted) return;
        const mapped = (data.items || []).map((it) => ({ ...it, price: Number(it.price) }));
        setItems(mapped);
      } catch (err) {
        console.error("Failed to fetch items", err);
      } finally {
        if (mounted) setLoadingItems(false);
      }
    };
    fetchItems();
    return () => { mounted = false; };
  }, []);

  const categories = [
    "All",
    ...Array.from(new Set(items.filter(i => i?.category).map(i => i.category)))
  ];

  const filteredItems = items
    .filter(item => item && typeof item.name === "string")
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

  // Add to cart
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
    logSystemAccess(currentUser, "Add to Cart", `Added "${item.name}" to cart`);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const getTotal = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowRFIDModal(true);
    setScanningRFID(true);
    setCustomer(null);
    rfidRef.current = "";
    setRfidBufferDisplay("");
  };

  // RFID scanning
  useEffect(() => {
    if (!showRFIDModal) return;

    const clearBuffer = () => {
      rfidRef.current = "";
      setRfidBufferDisplay("");
      if (rfidTimeoutRef.current) clearTimeout(rfidTimeoutRef.current);
      rfidTimeoutRef.current = null;
    };

    const onKeyDown = (e) => {
      const k = e.key;
      if (k === "Enter") {
        const code = (rfidRef.current || "").trim();
        if (code.length) fetchCustomer(code);
        clearBuffer();
        return;
      }
      if (k.length === 1) {
        rfidRef.current += k;
        setRfidBufferDisplay(rfidRef.current);
        if (rfidTimeoutRef.current) clearTimeout(rfidTimeoutRef.current);
        rfidTimeoutRef.current = setTimeout(clearBuffer, 300);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (rfidTimeoutRef.current) clearTimeout(rfidTimeoutRef.current);
    };
  }, [showRFIDModal]);

  const fetchCustomer = async (rfid) => {
    try {
      setScanningRFID(true);
      const code = rfid.trim();
      if (!code) throw new Error("Empty RFID");

      const res = await fetch(`/api/rfid/scan?rfid=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!data || !data.customer) throw new Error(data?.error || "Invalid RFID");

      const customerData = data.customer;
      setCustomer({ id: customerData.id, name: customerData.name, balance: Number(customerData.balance) || 0 });
      setScanningRFID(false);

      if ((Number(customerData.balance) || 0) < getTotal()) setShowLowBalanceModal(true);
    } catch (err) {
      console.error("RFID scan error:", err);
      setScanningRFID(false);
      setShowInvalidModal(true);
      setCustomer(null);
    }
  };

  // Confirm Payment
  const confirmPayment = async () => {
    if (!customer || cart.length === 0) return;

    logSystemAccess(currentUser, "Confirm Payment", `Processing payment of ₱${getTotal().toFixed(2)} for ${customer.name}`);

    const checkoutPayload = { customerId: customer.id, cart };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        setShowInvalidModal(true);
        logSystemAccess(currentUser, "Confirm Payment Failed", data.error || "Checkout failed");
        return;
      }

      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const payload: ReceiptData = {
        id: `TX-${Date.now()}`,
        customerName: customer.name,
        oldBalance: customer.balance || 0,
        newBalance: data.newBalance,
        items: cart,
        total,
        date: new Date().toLocaleString(),
      };

      setCart([]);
      setShowRFIDModal(false);
      setCustomer({ ...customer, balance: data.newBalance });
      setReceiptData(payload);
      setShowReceiptModal(true);

      logSystemAccess(currentUser, "Confirm Payment Success", `Payment successful. New balance: ₱${data.newBalance}`);
    } catch (err: any) {
      setShowFailureModal(true);
      setErrorMessage(err.message || "Checkout failed.");
      logSystemAccess(currentUser, "Confirm Payment Error", err.message);
    }
  };

  // Add Item
  const handleAddItem = async () => {
    logSystemAccess(currentUser, "Add Item Attempt", `Attempting to add item: ${addName}, Price: ${addPrice}, Category: ${addCategory}`);
    if (!addName || !addPrice || !addCategory) {
      setErrorMessage("Please fill in all fields.");
      setShowFailureModal(true);
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch("/api/cashier/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName, price: Number(addPrice), category: addCategory }),
      });
      if (!res.ok) throw new Error("Failed to add item");
      const data = await res.json();
      setItems(prev => [...prev, data.item]);
      setShowAddModal(false);
      setShowSuccessModal(true);
      setAddName(""); setAddPrice(""); setAddCategory("");

      logSystemAccess(currentUser, "Add Item Success", `Added "${data.item.name}" (₱${data.item.price.toFixed(2)})`);
    } catch (err) {
      setErrorMessage(err.message || "An error occurred while adding the item.");
      setShowFailureModal(true);
      logSystemAccess(currentUser, "Add Item Failed", err.message);
    } finally { setIsAdding(false); }
  };
  return (
    <div className="container-fluid p-0 pt-0 h-100">
      <div className="row h-100">
        {/* LEFT: Items */}
        <div className="col-12 col-md-6 border-end d-flex pt-0 flex-column">
          <div className="p-3 bg-light border-bottom sticky-top">
            <div className="d-flex justify-content-between align-items-center pt-0 mb-1">
              <h4 className="m-0">Available Items</h4>
              <button className="btn btn-primary btn-sm px-3 py-2" onClick={() => setShowAddModal(true)}>+ Add Item</button>
            </div>
            <div className="d-flex flex-column gap-2 mb-0">
              <input
                className="form-control form-control-sm"
                style={{ height: "35px", width: "280px", fontSize: "13px", padding: "4px 7px" }}
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <div className="d-flex flex-wrap gap-1">
                {categories.map(c => (
                  <button key={c} className={`btn btn-sm ${selectedCategory === c ? "btn-primary text-white" : "btn-outline-secondary"}`} style={{ borderRadius: "20px", padding: "3px 12px" }} onClick={() => setSelectedCategory(c)}>{c}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-grow-1 p-3 pt-0" style={{ maxHeight: 'calc(97vh - 150px)', overflowY: 'auto' }}>
            <table className="table table-sm table-hover">
              <thead className="bg-light" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr><th>Item Name</th><th style={{ width: '35%' }}>Price</th><th></th></tr>
              </thead>
              <tbody>
                {loadingItems ? [...Array(6)].map((_, i) => <tr key={i}><td colSpan={3}><div className="skeleton" /></td></tr>)
                  : filteredItems.slice(0, 13).map(item => (
                    <tr key={item.id}>
                      <td><div>{item.name}</div>{item.category && <span className="badge text-dark mt-1 fw-light-bold" style={{ fontSize: '0.75rem', backgroundColor: '#e0e0e0' }}>{item.category}</span>}</td>
                      <td>₱{Number(item.price).toFixed(2)}</td>
                      <td><button className="btn btn-primary btn-sm py-2 px-4 mt-1" onClick={() => addToCart(item)}>Add</button></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Cart */}
        <div className="col-12 col-md-6 d-flex flex-column px-3 py-0 pb-3 position-relative">
          <div className="flex-grow-1 overflow-auto">
            <table className="table table-sm table-hover mb-0">
              <thead className="sticky-top bg-light border-bottom">
                <tr><th style={{ width: '40%' }}>Item</th><th style={{ width: '20%' }}>Qty</th><th>Price</th><th></th></tr>
              </thead>
              <tbody>
                {cart.length === 0 ? <tr><td colSpan={4} className="text-center text-muted py-5"><i className="bi bi-cart-x fs-1"></i><div>No items in cart</div></td></tr>
                  : cart.map(item => (
                    <tr key={item.id} className="cart-item">
                      <td className="text-start">{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>₱{(item.price * item.quantity).toFixed(2)}</td>
                      <td><button className="btn btn-sm btn-outline-danger" onClick={() => removeFromCart(item.id)}>Remove</button></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <div className="position-sticky bottom-0 bg-light p-3 border-top shadow-sm" style={{ borderRadius: "8px" }}>
            <div className="d-flex justify-content-between mb-2"><strong>Total:</strong><strong className="text-success">₱{getTotal().toFixed(2)}</strong></div>
            <button className="btn btn-success w-100 py-2 fs-6" onClick={handleCheckout}>Checkout</button>
          </div>
        </div>
      </div>

     {/* Add Item Modal */}
{showAddModal && (
  <div
    className="modal d-block"
    tabIndex={-1}
    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
  >
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content p-3 border-0 rounded-4 shadow-lg">
        <div className="card shadow-none border-0">
          <div className="card-header bg-gradient fw-bold text-black">
            Add New Item
          </div>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddItem();
                // logSystemAccess("Cashier submitted Add Item form");
              }}
            >
              <div className="mb-3">
                <label className="form-label">Item Name</label>
                <input
                  className="form-control"
                  placeholder="Enter item name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Price</label>
                <div className="input-group">
                  <span className="input-group-text">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="d-flex gap-2">
                <div className="mb-3 w-100 d-flex justify-content-end gap-2">
  <button
    type="button"
    className="btn btn-secondary"
    onClick={() => {
      setShowAddModal(false);
      // logSystemAccess("Cashier closed Add Item modal");
    }}
  >
    Close
  </button>
  <button
    type="submit"
    className="btn btn-primary"
    disabled={isAdding}
  >
    {isAdding ? "Processing..." : "Add Item"}
  </button>
</div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      {showSuccessModal && <ModalMessage title="Success!" message="Item added successfully." onClose={() => setShowSuccessModal(false)} />}
      {showFailureModal && <ModalMessage title="Error" message={errorMessage} onClose={() => setShowFailureModal(false)} />}
      {showRFIDModal && (
  <ModalWrapper onClose={() => setShowRFIDModal(false)}>
    <h5>Scan RFID Card</h5>
    <p>{rfidBufferDisplay || (scanningRFID ? "Waiting for scan..." : "")}</p>
    {customer && <div className="mt-2">Customer: {customer.name} | Balance: ₱{customer.balance.toFixed(2)}</div>}
    <div className="mt-3">
      {customer && customer.balance >= getTotal() && (
        <button
          className="btn btn-success w-100"
          onClick={confirmPayment} // ✅ Updated to call the backend
        >
          Confirm Payment
        </button>
      )}
      <button className="btn btn-secondary w-100 mt-2" onClick={() => setShowRFIDModal(false)}>Cancel</button>
    </div>
  </ModalWrapper>
)}


      {showLowBalanceModal && <ModalMessage title="Insufficient Balance" message="Customer has insufficient balance." onClose={() => setShowLowBalanceModal(false)} />}
      {showInvalidModal && <ModalMessage title="Invalid RFID" message="RFID not recognized." onClose={() => setShowInvalidModal(false)} />}

      {/* Receipt modal */}
      {receiptData && showReceiptModal && (
        <ReceiptPage data={receiptData} onClose={() => setShowReceiptModal(false)} />
      )}

      <style jsx>{`.skeleton { background: #e0e0e0; border-radius: 6px; height: 40px; }`}</style>
    </div>
  );
}

// Generic modal wrapper
function ModalWrapper({ children, onClose }) {
  return (
    <div
      className="modal d-block position-fixed top-0 start-0"
      style={{ zIndex: 1050 }}
    >
      {/* Dark / blurred overlay */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />
      {/* Centered modal */}
      <div
        className="modal-dialog modal-dialog-centered position-relative"
      >
        <div className="modal-content p-3 border-0 rounded-4 shadow-lg">
          {children}
        </div>
      </div>
    </div>
  );
}



// Reusable modal message
function ModalMessage({ title, message, onClose }) {
  return (
    <ModalWrapper onClose={onClose}>
      <h5>{title}</h5>
      <p>{message}</p>
      <button className="btn btn-primary w-100 mt-2" onClick={onClose}>Close</button>
    </ModalWrapper>
  );
}
