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
  ...Array.from(
    new Set(
      (items || [])
        .filter((i) => i && typeof i === "object" && "category" in i)
        .map((item: any) => item.category)
        .filter(Boolean)
    )
  ),
];


    const filteredItems = (items || [])
  .filter((item): item is Item => item && typeof item.name === "string")
  .filter((item) => {
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
      <div className="container-fluid p-0 pt-0 h-100">
        <div className="row h-100">
          {/* LEFT SIDE - Available Items Table */}
          <div className="col-12 col-md-6 border-end d-flex pt-0 flex-column">
            <div className="p-3 bg-light border-bottom sticky-top">
              <div className="d-flex justify-content-between align-items-center pt-0 mb-1">
                <h4 className="m-0">Available Items</h4>
                <button
                  className="btn btn-primary btn-sm px-3 py-2"
                  onClick={() => setShowAddModal(true)}
                >
                  + Add Item
                </button>
              </div>
              <div className="d-flex flex-column gap-2 mb-0">
                <input
                  className="form-control form-control-sm"
                  style={{ height:"35px",width: "280px", fontSize: "13px", padding: "4px 7px" }}
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

            <div
    className="flex-grow-1 p-3 pt-0"
    style={{ maxHeight: 'calc(97vh - 150px)', overflowY: 'auto' }}
  >
    <table className="table table-sm table-hover">
      <thead className="bg-light" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <tr>
          <th>Item Name</th>
          <th style={{ width: '35%' }}>Price</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {loadingItems
          ? [...Array(6)].map((_, i) => (
              <tr key={i}>
                <td colSpan={3}><div className="skeleton"></div></td>
              </tr>
            ))
          : filteredItems.slice(0, 13).map((item) => (
              <tr key={item.id}>
                <td>
  <div>{item.name}</div>
  {item.category && (
    <span
      className="badge text-dark mt-1 fw-light-bold"
      style={{ fontSize: '0.75rem', backgroundColor: '#e0e0e0' }} // light gray
    >
      {item.category}
    </span>
  )}
</td>
                <td>₱{item.price.toFixed(2)}</td>
                <td>
                  <button className="btn btn-primary btn-sm py-2 px-4 mt-1" onClick={() => addToCart(item)}>Add</button>
                </td>
              </tr>
            ))}
      </tbody>
    </table>
  </div>
          </div>

          {/* RIGHT SIDE CART Table */}
          <div className="col-12 col-md-6 d-flex flex-column px-3 py-0 pb-3 position-relative">
              <div className="flex-grow-1 overflow-auto">
                <table className="table table-sm table-hover mb-0">
                  <thead className="sticky-top bg-light border-bottom">
                    <tr>
                      <th style={{ width: '40%' }}>Item</th>
                      <th style={{ width: '20%' }}>Qty</th>
                      <th>Price</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-5">
                          <i className="bi bi-cart-x fs-1"></i>
                          <div>No items in cart</div>
                        </td>
                      </tr>
                    ) : (
                      cart.map((item) => (
                        <tr key={item.id} className="cart-item">
                          <td className="text-start">{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>₱{(item.price * item.quantity).toFixed(2)}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => removeFromCart(item.id)}>Remove</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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

        {showAddModal && (
  <div className="modal d-block">
    {/* Dark / blurred overlay */}
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(5px)',
        zIndex: 1040
      }}
      onClick={() => setShowAddModal(false)}
    ></div>

    {/* Wider modal */}
    <div
      className="modal-dialog modal-dialog-centered position-fixed top-50 start-50 translate-middle"
      style={{ zIndex: 1050, maxWidth: '500px', width: '90%' }}
    >
      <div className="modal-content rounded-4 shadow position-relative">
        <div className="modal-header bg-gradient fw-bold text-black">
          <h5 className="modal-title m-0">Add New Item</h5>
        </div>
        <div className="modal-body">
          <form onSubmit={(e) => { e.preventDefault(); handleAddItem(); }}>
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
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
)}




        {/* Other Modals unchanged */}
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
          body, html {
            margin: 0;
            padding: 0;
          }
          .skeleton {
            background: #e0e0e0;
            border-radius: 6px;
            height: 40px;
          }
          .cart-item:hover {
            background-color: #f8f9fa;
          }
        `}</style>
      </div>
    );
  }
