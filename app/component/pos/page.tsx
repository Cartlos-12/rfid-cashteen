'use client';

import { useEffect, useState } from "react";

interface Item {
  id: number;
  name: string;
  price: number;
  category?: string;
}
interface CartItem extends Item {
  quantity: number;
}
interface Customer {
  id: string;
  name: string;
  balance: number;
}

export default function CashierPOS() {
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showRFIDModal, setShowRFIDModal] = useState(false);
  const [scanningRFID, setScanningRFID] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rfidBuffer, setRfidBuffer] = useState("");
  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);
  const [showInvalidModal, setShowInvalidModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      const res = await fetch("/api/cashier/items");
      const data = await res.json();
      setTimeout(() => {
        setItems(
          (data.items || []).map((item: any) => ({
            ...item,
            price: Number(item.price),
          }))
        );
        setLoadingItems(false);
      }, 800);
    };
    fetchItems();
  }, []);

  const categories = [
    "All",
    ...Array.from(new Set(items.map((item) => item.category).filter(Boolean))),
  ];

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item: Item) =>
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });

  const decreaseQuantity = (id: number) =>
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );

  const removeFromCart = (id: number) =>
    setCart((prev) => prev.filter((i) => i.id !== id));

  const getTotal = () =>
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowRFIDModal(true);
    setScanningRFID(true);
    setCustomer(null);
    setRfidBuffer("");
  };

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (!showRFIDModal) return;
      if (e.key === "Enter") {
        fetchCustomer(rfidBuffer.trim());
        setRfidBuffer("");
      } else {
        setRfidBuffer((prev) => prev + e.key);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [rfidBuffer, showRFIDModal]);

  const fetchCustomer = async (rfid: string) => {
    try {
      const res = await fetch(`/api/cashier/customer?rfid=${rfid}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCustomer(data);
      setScanningRFID(false);
      if (data.balance < getTotal()) setShowLowBalanceModal(true);
    } catch {
      setScanningRFID(false);
      setShowInvalidModal(true);
    }
  };

  const confirmPayment = () => {
    if (!customer) return;
    const total = getTotal();
    const newBalance = customer.balance - total;

    setReceiptData({
      name: customer.name,
      oldBalance: customer.balance,
      newBalance,
      items: cart,
      total,
      date: new Date().toLocaleString(),
    });

    customer.balance = newBalance;
    setCart([]);
    setShowRFIDModal(false);
    setShowReceipt(true);
  };

  const handleAddItem = async () => {
    if (!addName || !addPrice) return;
    const res = await fetch("/api/cashier/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: addName,
        price: Number(addPrice),
        category: addCategory,
      }),
    });
    const data = await res.json();
    setItems((prev) => [...prev, data.item]);
    setShowAddModal(false);
    setAddName("");
    setAddPrice("");
    setAddCategory("");
  };

  return (
    <div className="container-fluid p-2 h-100">
      <div className="row h-100">
        {/* LEFT SIDE - Available Items */}
        <div className="col-12 col-md-6 border-end d-flex flex-column">
          <div className="p-3 bg-light border-bottom sticky-top">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">Available Items</h5>
              <button
                className="btn btn-primary btn-sm px-3 py-2"
                onClick={() => setShowAddModal(true)}
              >
                + Add Item
              </button>
            </div>

            {/* Search and Categories in Column Layout */}
            <div className="d-flex flex-column gap-2 mb-2">
              <input
                className="form-control form-control-sm"
                style={{ width: "250px", fontSize: "13px", padding: "3px 6px" }}
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="d-flex flex-wrap gap-1">
                {categories.map((c) => (
                  <button
                    key={c}
                    className={`btn btn-sm ${selectedCategory === c ? "btn-primary text-white" : "btn-outline-secondary"}`}
                    style={{ borderRadius: "20px", padding: "3px 12px" }}
                    onClick={() => setSelectedCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable Items Grid */}
          <div className="flex-grow-1 overflow-auto p-2">
            <div className="row g-2">
              {loadingItems
                ? [...Array(6)].map((_, i) => (
                    <div key={i} className="col-6 col-md-4">
                      <div className="card p-2 skeleton"></div>
                    </div>
                  ))
                : filteredItems.map((item) => (
                    <div key={item.id} className="col-6 col-md-4">
                      <div className="card p-2 text-center h-100 d-flex flex-column">
                        <div className="flex-grow-1">
                          <strong className="small">{item.name}</strong>
                          <p className="m-0 text-muted small">₱{item.price.toFixed(2)}</p>
                          {item.category && <span className="badge bg-secondary small mb-1">{item.category}</span>}
                        </div>
                        <button
                          className="btn btn-primary w-100 mt-2 py-2"
                          onClick={() => addToCart(item)}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE CART */}
        <div className="col-12 col-md-6 d-flex flex-column p-3 position-relative">
          <h5 className="m-0 mb-3 sticky-top bg-white py-2 border-bottom">Cart</h5>

          {/* Fixed Table Header Below Cart Title */}
          <div className="bg-light border-bottom py-2">
            <div className="row text-start fw-bold">
              <div className="col-6">Item</div>
              <div className="col-3">Qty</div>
              <div className="col-3">Price</div>
            </div>
          </div>

          {/* Scrollable Cart Items */}
          <div className="flex-grow-1 mb-5">
            {cart.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="bi bi-cart-x fs-1"></i>
                <p>No items in cart</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="row text-center align-items-center py-2 border-bottom cart-item">
                  <div className="col-5 text-start">
                    <strong>{item.name}</strong> 
                  </div>
                  <div className="col-3">{item.quantity}</div>
                  <div className="col-3 fw-bold">₱{(item.price * item.quantity).toFixed(2)}</div>
                  <div className="col-auto">
                  </div>
                </div>
              ))
            )}
          </div>

          {/* STICKY CHECKOUT */}
          <div className="position-sticky bottom-0 bg-light p-3 border-top shadow-sm" style={{ borderRadius: "8px" }}>
            <div className="d-flex justify-content-between mb-2">
              <strong>Total:</strong>
              <strong className="text-success">₱{getTotal().toFixed(2)}</strong>
            </div>
            <button className="btn btn-success w-100 py-2 fs-6" onClick={handleCheckout}>Checkout</button>
          </div>
        </div>
      </div>

      {/* MODALS (all preserved) */}
      {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content p-3">
              <h5>Add Item</h5>
              <input className="form-control my-2" placeholder="Item Name" value={addName} onChange={(e) => setAddName(e.target.value)} />
              <input className="form-control my-2" placeholder="Price" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} />
              <input className="form-control my-2" placeholder="Category" value={addCategory} onChange={(e) => setAddCategory(e.target.value)} />
              <div className="d-flex justify-content-end gap-2 mt-2">
                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddItem}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RFID Scan Modal */}
      {showRFIDModal && (
        <div className="modal d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content p-3 text-center">
              <h5>Scanning RFID...</h5>
              {scanningRFID ? <p>Place card near reader</p> : customer ? <p>Customer: {customer.name}</p> : <p>Processing...</p>}
              <button className="btn btn-secondary mt-2" onClick={() => setShowRFIDModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Low Balance Modal */}
      {showLowBalanceModal && (
        <div className="modal d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content p-3 text-center">
              <h5>Low Balance</h5>
              <p>Customer does not have enough balance!</p>
              <button className="btn btn-secondary" onClick={() => setShowLowBalanceModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Invalid RFID Modal */}
      {showInvalidModal && (
        <div className="modal d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content p-3 text-center">
              <h5>Invalid RFID</h5>
              <p>RFID not recognized!</p>
              <button className="btn btn-secondary" onClick={() => setShowInvalidModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="modal d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content p-3">
              <h5>Receipt - {receiptData.name}</h5>
              <p>Date: {receiptData.date}</p>
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items.map((i: any) => (
                    <tr key={i.id}>
                      <td>{i.name}</td>
                      <td>{i.quantity}</td>
                      <td>₱{i.price * i.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>Total: ₱{receiptData.total}</p>
              <p>Balance: ₱{receiptData.oldBalance} → ₱{receiptData.newBalance}</p>
              <button className="btn btn-success w-100" onClick={() => setShowReceipt(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .skeleton {
          background: #e0e0e0;
          border-radius: 6px;
          height: 80px;
        }
        .cart-item {
          border-bottom: 1px solid #dee2e6;
        }
        .cart-item:hover {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
}
