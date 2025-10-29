'use client';

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReceiptPage, { ReceiptData } from "../../component/receipt/page";

// Updated system log function to match your database schema
const logSystemAccess = (user: { id: string; name: string; role: string }, action: string, details: string) => {
  console.log(`[SYSTEM LOG] UserID: ${user.id}, UserName: ${user.name}, Role: ${user.role}, Action: ${action}, Details: ${details}`);
  
  // Send log to your backend API to insert into the logs table

fetch("/api/admin/user-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.id,
      user_name: user.name,
      role: user.role,
      action,
      details
    })
  });
};

export default function CashierPOS() {
  const router = useRouter();

  // ✅ Replace with actual logged-in user info
  const currentUser = { 
    id: "1", 
    name: "cashier",  
    role: "cashier"   
  };

  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addCategory, setAddCategory] = useState("");

  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // RFID & Checkout states
  const [showRFIDModal, setShowRFIDModal] = useState(false);
  const [scanningRFID, setScanningRFID] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [rfidBufferDisplay, setRfidBufferDisplay] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const rfidRef = useRef("");
  const rfidTimeoutRef = useRef<any>(null);

  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);
  const [showInvalidModal, setShowInvalidModal] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const [deleteItemName, setDeleteItemName] = useState("");
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

  // Fetch items
    // ✅ Reusable fetchItems function for auto-refresh
const fetchItemsFromAPI = async () => {
  try {
    setLoadingItems(true);
    const res = await fetch("/api/cashier/items");
    const data = await res.json();
    const mapped = Array.isArray(data)
      ? data.map(it => ({ ...it, price: Number(it.price) }))
      : [];
    setItems(mapped);
  } catch (err) {
    console.error("Failed to fetch items", err);
    setItems([]);
  } finally {
    setLoadingItems(false);
  }
};

    useEffect(() => {
  fetchItemsFromAPI(); // Fetch items on mount
}, []);

  const categories = [
    "All",
    ...Array.from(
      new Set(
        items
          .filter(
            (i) =>
              i?.category &&
              !["Food", "Cold/Iced", "None"].includes(i.category.trim())
          )
          .map((i) => i.category)
      )
    ),
  ];

  const filteredItems = items
    .filter(item => item && typeof item.name === "string")
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

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

  // Checkout
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

  const onKeyDown = (e: KeyboardEvent) => {
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

// --- FIXED fetchCustomer function ---
const fetchCustomer = async (rfid: string) => {
  try {
    setScanningRFID(true);
    const code = rfid.trim();
    if (!code) throw new Error("Empty RFID");

    const res = await fetch(`/api/rfid/scan?rfid=${encodeURIComponent(code)}`);
    const data = await res.json();

    if (!data || !data.customer) throw new Error(data?.error || "Invalid RFID");

    const customerData = data.customer;
    const balance = Number(customerData.balance) || 0;

    setCustomer({
      id: customerData.id,
      name: customerData.name,
      balance,
    });

    setScanningRFID(false);
    setShowRFIDModal(false); // ✅ close RFID modal
    setRfidBufferDisplay("");
    rfidRef.current = "";

    // ✅ handle low balance case
    if (balance < getTotal()) {
      setShowLowBalanceModal(true);
      return;
    }

    // ✅ open payment modal after successful scan
    setShowPaymentModal(true);

  } catch (err) {
    console.error("RFID scan error:", err);
    setScanningRFID(false);
    setShowInvalidModal(true);
    setCustomer(null);
  }
};

  const confirmPayment = async () => {
    if (!customer || cart.length === 0) return;

    logSystemAccess(currentUser, "Confirm Payment", `Processing payment of ₱${getTotal().toFixed(2)} for ${customer.name}`);
    setLoadingPayment(true);

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
    } finally {
      setLoadingPayment(false);
    }
  };

  // Add, Edit, Delete Item handlers (existing code)
  // --- Modify handleAddItem ---
// ✅ Call fetchItemsFromAPI after successful add
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

    // ✅ REFRESH ITEMS LIST AUTOMATICALLY
    await fetchItemsFromAPI();

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

// --- Modify handleEditItem ---
// ✅ Call fetchItemsFromAPI after successful edit
{/* Handle Edit with Success Modal */}
const handleEditItemWithSuccess = async () => {
  if (!selectedItem) return;
  setIsEditing(true);
  try {
    const res = await fetch("/api/cashier/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedItem.id,
        name: editName || selectedItem.name,
        price: Number(editPrice),
        category: editCategory || selectedItem.category,
        userId: currentUser.id,
        userName: currentUser.name
      })
    });

    if (!res.ok) throw new Error("Failed to edit item");
    const data = await res.json();

    // Refresh items list
    await fetchItemsFromAPI();

    // Close edit modal
    setShowEditModal(false);

    // Show success modal
    setSuccessMessage(`Item "${data.item.name}" updated successfully!`);
    setShowSuccessModal(true);

    // Reset form
    setSelectedItem(null);
    setEditName(""); 
    setEditPrice(""); 
    setEditCategory("");

    logSystemAccess(currentUser, "Edit Item Success", `Edited "${data.item.name}"`);
  } catch (err) {
    setErrorMessage(err.message || "Failed to edit item, check the inputed name.");
    setShowFailureModal(true);
    logSystemAccess(currentUser, "Edit Item Failed", err.message);
  } finally {
    setIsEditing(false);
  }
};

// --- Modify handleDeleteItem ---
// ✅ Call fetchItemsFromAPI after successful delete
const handleDeleteItem = async () => {
  if (!selectedItem) return;
  setIsDeleting(true);
  try {
    const res = await fetch(`/api/cashier/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: deleteItemName, userId: "1", userName: "cashier" })
    });

    if (!res.ok) throw new Error("Failed to delete item, check the item name.");

    // ✅ REFRESH ITEMS LIST AUTOMATICALLY
    await fetchItemsFromAPI();

    setShowDeleteModal(false);
    setDeleteItemName("");
    setShowDeleteSuccessModal(true);
    logSystemAccess(currentUser, "Delete Item Success", `Deleted "${selectedItem.name}"`);
  } catch (err) {
    setErrorMessage(err.message || "Failed to delete item, check the item name.");
    setShowFailureModal(true);
    logSystemAccess(currentUser, "Delete Item Failed", err.message);
  } finally {
    setIsDeleting(false);
  }
};

  // --------------------------
  // RENDER STARTS HERE
  // --------------------------
  return (
    <div className="container-fluid p-0 pt-0 h-100">
      <div className="row h-100">
        {/* LEFT: Items */}
        <div className="col-12 col-md-6 border-end d-flex pt-0 flex-column" style={{ height: '103%', width: '50%', marginLeft: '-29px' }}>
          <div className="p-3 bg-light border-bottom sticky-top">
            <div className="d-flex gap-2 mb-1" style={{marginTop:'-18px'}}>
              <button className="btn btn-primary btn-sm px-3 py-2" onClick={() => setShowAddModal(true)}>+ Add Item</button>
              <button className="btn btn-warning btn-sm px-3 py-2" onClick={() => setShowEditModal(true)}> Edit Item </button>

              <button className="btn btn-danger btn-sm px-3 py-2" onClick={() => { setSelectedItem(filteredItems[0] || null); setShowDeleteModal(true); }}>Delete Item</button>
            </div>
            <h4 className="mt-3 mb-2">Available Items</h4>
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
                <tr>
                  <th>Item Name</th>
                  <th style={{ width: '35%' }}>Price</th>
                  <th></th>
                </tr>
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
                <tr>
                  <th style={{ width: '40%' }}>Item</th>
                  <th style={{ width: '20%' }}>Qty</th>
                  <th>Price</th>
                  <th></th>
                </tr>
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
          <div className="position-sticky bottom-5 bg-light p-3 border-top shadow-sm" style={{ borderRadius: "8px" }}>
            <div className="d-flex justify-content-between mb-2"><strong>Total:</strong><strong className="text-success">₱{getTotal().toFixed(2)}</strong></div>
            <button className="btn btn-success w-100 py-2 fs-6" onClick={handleCheckout}>Checkout</button>
          </div>
        </div>
      </div>

      {/* Add/Edit/Delete, RFID, Low Balance, Invalid, Receipt modals */}
            {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3 border-0 rounded-4 shadow-lg">
              <div className="card shadow-none border-0">
                <div className="card-header bg-gradient fw-bold text-black">Add New Item</div>
                <div className="card-body">
                  <form onSubmit={(e) => { e.preventDefault(); handleAddItem(); }}>
                    <div className="mb-3">
                      <label className="form-label">Item Name</label>
                      <input className="form-control" placeholder="Enter item name" value={addName} onChange={(e) => setAddName(e.target.value)} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Price</label>
                      <div className="input-group">
                        <span className="input-group-text">₱</span>
                        <input type="number" step="0.01" className="form-control" placeholder="0.00" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Category</label>
                      <select className="form-select" value={addCategory} onChange={(e) => setAddCategory(e.target.value)}>
                        <option value="">Select a category</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Close</button>
                      <button type="submit" className="btn btn-primary" disabled={isAdding}>{isAdding ? "Processing..." : "Add Item"}</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
{/* Edit Item Modal */}
{showEditModal && (
  <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content p-3 border-0 rounded-4 shadow-lg">
        <div className="card shadow-none border-0">
          <div className="card-header bg-gradient fw-bold text-black">Edit Item</div>
          <div className="card-body">
            {/* STEP 1: Enter item name */}
            {!selectedItem || !selectedItem.id ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                const item = items.find(i => i.name.toLowerCase() === editName.trim().toLowerCase());
                if (!item) {
                  setErrorMessage("Item not found.");
                  setShowFailureModal(true);
                  return;
                }
                setSelectedItem(item);
                setEditPrice(item.price);
                setEditCategory(item.category || "");
              }}>
                <div className="mb-3">
                  <label className="form-label">Enter Item Name to Edit</label>
                  <input
                    className="form-control"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Type the exact item name"
                  />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Close</button>
                  <button type="submit" className="btn btn-warning">Confirm</button>
                </div>
              </form>
            ) : (
              // STEP 2: Edit details
              <form onSubmit={(e) => { e.preventDefault(); handleEditItemWithSuccess(); }}>
                <div className="mb-3">
                  <label className="form-label">Item Name</label>
                  <input className="form-control" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Price</label>
                  <div className="input-group">
                    <span className="input-group-text">₱</span>
                    <input type="number" step="0.01" className="form-control" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => { 
                    setShowEditModal(false); 
                    setSelectedItem(null); 
                    setEditName(""); 
                    setEditPrice(""); 
                    setEditCategory(""); 
                  }}>Close</button>
                  <button type="submit" className="btn btn-warning" disabled={isEditing}>{isEditing ? "Saving..." : "Save Changes"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)}


      {/* Delete Item Modal */}
      {/* Delete Item Modal */}
{showDeleteModal && (
  <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content p-3 border-0 rounded-4 shadow-lg">
        <div className="card shadow-none border-0">
          <div className="card-header bg-gradient fw-bold text-black">Delete Item</div>
          <div className="card-body">
            <p>Enter the <strong>name of the item</strong> you want to delete:</p>
            <input
              type="text"
              className="form-control mb-3"
              placeholder="Enter item name"
              value={deleteItemName}
              onChange={(e) => setDeleteItemName(e.target.value)}
            />
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => { setShowDeleteModal(false); setDeleteItemName(''); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteItem}
                disabled={isDeleting || !deleteItemName.trim()}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

{/* Delete Success Modal */}
{showDeleteSuccessModal && (
  <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content p-3 border-0 rounded-4 shadow-lg text-center">
        <h5 className="text-success fw-bold">Item Deleted</h5>
        <p>The item has been successfully deleted from the inventory.</p>
        <button className="btn btn-success" onClick={() => setShowDeleteSuccessModal(false)}>Close</button>
      </div>
    </div>
  </div>
)}


      {/* Scan RFID Modal */}
      <div
  className={`modal fade ${showRFIDModal ? "show d-block" : ""}`}
  tabIndex={-1}
  style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
>
  <div className="modal-dialog modal-dialog-centered">
    <div className="modal-content">
      <div className="modal-header">
        <h5 className="modal-title">🔄 Scan Your RFID</h5>
        <button
          type="button"
          className="btn-close"
          onClick={() => setShowRFIDModal(false)}
        ></button>
      </div>
      <div className="modal-body">
        <p>Please tap your ID card on the reader to proceed.</p>
        <p>Scanned: {rfidBufferDisplay}</p>
      </div>
      <div className="modal-footer">
        <button
          className="btn btn-secondary w-100"
          onClick={() => setShowRFIDModal(false)}
        >
          Cancel
        </button>
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
                <button className="btn btn-success" onClick={() => { confirmPayment(); setShowPaymentModal(false); }}>Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low Balance Modal */}
      {showLowBalanceModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3 border-0 rounded-4 shadow-lg text-center">
              <h5>Insufficient Balance</h5>
              <p>Customer balance is lower than the total amount!</p>
              <button className="btn btn-warning" onClick={() => setShowLowBalanceModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Invalid RFID Modal */}
      {showInvalidModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3 border-0 rounded-4 shadow-lg text-center">
              <h5>Invalid RFID</h5>
              <p>The scanned RFID is invalid. Please try again.</p>
              <button className="btn btn-danger" onClick={() => setShowInvalidModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

     
{showReceiptModal && receiptData && (
  <div
    className="modal d-block"
    style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 2000 }}
  >
    <div className="modal-dialog modal-dialog-centered modal-lg">
        {loadingPayment ? (
          <div className="p-3">
            <div
              className="skeleton"
              style={{ width: "80%", height: "25px", marginBottom: "10px" }}
            />
            <div
              className="skeleton"
              style={{ width: "60%", height: "20px", marginBottom: "5px" }}
            />
            <div
              className="skeleton"
              style={{ width: "90%", height: "150px", marginBottom: "10px" }}
            />
            <div
              className="skeleton"
              style={{ width: "40%", height: "20px", marginBottom: "5px" }}
            />
          </div>
        ) : (
          <ReceiptPage
            data={receiptData}
            onClose={() => {
              setShowReceiptModal(false);
              setReceiptData(null);
              setShowPaymentModal(false);
              setCustomer(null);
            }}
          />
        )}    
    </div>
  </div>
)}


      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3 border-0 rounded-4 shadow-lg text-center">
              <h5>Success</h5>
              <p>Action completed successfully!</p>
              <button className="btn btn-success" onClick={() => setShowSuccessModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Failure Modal */}
      {showFailureModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-3 border-0 rounded-4 shadow-lg text-center">
              <h5>Error</h5>
              <p>{errorMessage}</p>
              <button className="btn btn-danger" onClick={() => setShowFailureModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

