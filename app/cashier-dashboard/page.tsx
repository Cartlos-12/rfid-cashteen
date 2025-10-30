'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HouseDoor, Cart, ClockHistory, CashStack, Basket } from "react-bootstrap-icons";
import CashierPOS from "../component/pos/page";
import CashierTransactions from "../transactions/page";

type Item = {
  id: number;
  name: string;
  price: number;
  category: string;
  created_at: string;
};

type Transaction = {
  id: number;
  itemId: number;
  quantity: number;
  total: number;
  created_at: string;
};

export default function CashierDashboard() {
  const router = useRouter();
  const [active, setActive] = useState("dashboard");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [salesSummary, setSalesSummary] = useState({
    totalSales: 0,
    totalTransactions: 0,
    topItems: [] as { name: string; quantity: number }[],
  });

  // Check session on mount
  useEffect(() => {
    const session = localStorage.getItem("sessionActive");
    if (!session) {
      router.replace("/");
    } else {
      setSessionChecked(true);
      fetchItemsForToday();
      fetchTransactionsForToday();
      setupAutoRefresh();
    }
  }, [router]);

  // Logout function
  const handleLogout = async () => {
    const sessionStr = localStorage.getItem("sessionActive");
    if (!sessionStr) {
      router.replace("/");
      return;
    }

    const sessionData = JSON.parse(sessionStr);
    localStorage.removeItem("sessionActive");
    try {
      await fetch("/api/admin/user-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: String(sessionData.id),
          userName: sessionData.username,
          role: sessionData.role || "cashier",
          action: "logout",
          details: "Cashier logged out",
        }),
      });
    } catch (err) {
      console.error("Failed to log logout:", err);
    } finally {
      router.replace("/");
    }
  };

  const menu = [
    { key: "dashboard", label: "Dashboard", icon: <HouseDoor /> },
    { key: "pos", label: "POS", icon: <Cart /> },
    { key: "history", label: "Transactions", icon: <ClockHistory /> },
  ];

  if (!sessionChecked) return null;

  // ------------------------
  // Function declarations
  // ------------------------
  async function fetchItemsForToday() {
  try {
    const res = await fetch("/api/cashier/items");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const items: Item[] = await res.json();
    if (!Array.isArray(items)) throw new Error("API did not return an array");

    const now = new Date();
    const hours = now.getHours();
    const category = hours < 12 ? "Food Pack A" : "Food Pack B";

    // Filter items safely
    const todayItems = items.filter(item => {
      if (!item || typeof item.category !== "string") return false;
      return (
        item.category === category ||
        ["Food", "Drink", "Other", "Snack"].includes(item.category)
      );
    });

    // Ensure each item has valid properties
    const sanitizedItems = todayItems.map(item => ({
      id: Number(item.id) || 0,
      name: String(item.name || "Unknown"),
      price: Number(item.price) || 0,
      category: String(item.category || "Other"),
      created_at: String(item.created_at || ""),
    }));

    setAvailableItems(sanitizedItems);
  } catch (err) {
    console.error("Failed to fetch items:", err);
    setAvailableItems([]);
  }
}


  async function fetchTransactionsForToday() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Fetch transactions for today
    const res = await fetch(`/api/transactions?date=${today}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data: Transaction[] = await res.json();
    if (!Array.isArray(data)) throw new Error("API did not return an array");

    setTransactions(data);

    // Ensure totalSales is always a number
    const totalSales = data.reduce((acc, t) => acc + Number(t.total || 0), 0);
    const totalTransactions = data.length;

    // Count quantities per item
    const itemCountMap: Record<number, number> = {};
    data.forEach(t => {
      const qty = Number(t.quantity || 0);
      if (t.itemId != null) {
        itemCountMap[t.itemId] = (itemCountMap[t.itemId] || 0) + qty;
      }
    });

    // Fetch all items
    const itemsRes = await fetch("/api/cashier/items");
    if (!itemsRes.ok) throw new Error(`HTTP error! status: ${itemsRes.status}`);
    const items: Item[] = await itemsRes.json();
    if (!Array.isArray(items)) throw new Error("API did not return an array");

    // Build top items using already availableItems state
    const topItems = Object.entries(itemCountMap)
      .map(([id, qty]) => {
        const found = availableItems.find(i => i.id === Number(id));
        return {
          name: found ? found.name : `Item #${id}`,
          quantity: qty
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);

    setSalesSummary({ totalSales, totalTransactions, topItems });
  } catch (err) {
    console.error("Failed to fetch transactions:", err);
    setTransactions([]);
    setSalesSummary({ totalSales: 0, totalTransactions: 0, topItems: [] });
  }
}


  function setupAutoRefresh() {
    const now = new Date();
    const msUntilNoon = (() => {
      const noon = new Date();
      noon.setHours(12, 0, 0, 0);
      return noon.getTime() - now.getTime();
    })();

    if (msUntilNoon > 0) {
      setTimeout(() => {
        fetchItemsForToday();
        fetchTransactionsForToday();
        setInterval(() => {
          fetchItemsForToday();
          fetchTransactionsForToday();
        }, 24 * 60 * 60 * 1000);
      }, msUntilNoon);
    } else {
      fetchItemsForToday();
      fetchTransactionsForToday();
      const msUntilNextNoon = 24 * 60 * 60 * 1000 - Math.abs(msUntilNoon);
      setTimeout(() => {
        fetchItemsForToday();
        fetchTransactionsForToday();
        setInterval(() => {
          fetchItemsForToday();
          fetchTransactionsForToday();
        }, 24 * 60 * 60 * 1000);
      }, msUntilNextNoon);
    }
  }

  const ProtectedComponent = ({ children }: { children: React.ReactNode }) => {
    const session = localStorage.getItem("sessionActive");
    if (!session) {
      router.replace("/");
      return null;
    }
    return <>{children}</>;
  };

  return (
    <div className="d-flex vh-100">
      <aside
  className="bg-dark text-light p-3 d-flex flex-column"
  style={{
    width: "290px",
    height: "100vh",       // full viewport height
    position: "fixed",     // fix it on the side
    top: 0,
    left: 0,
    overflowY: "auto",    // scroll if content is taller than viewport
  }}
>
        <h4 className="mb-4">Cashier Panel</h4>
        <ul className="nav flex-column flex-grow-1">
          {menu.map(item => (
            <li key={item.key} className="nav-item mb-2">
              <button
  onClick={() => setActive(item.key)}
  className={`d-flex align-items-center w-100 btn text-start ${
    active === item.key ? "btn-primary" : "btn-outline-light"
  }`}
  style={{
    padding: "0.75rem 1rem", // bigger vertical and horizontal padding
    fontSize: "1rem",      // slightly larger text
    height: "43px",
  }}
>
  <span className="me-3" style={{ fontSize: "1.3rem" }}>{item.icon}</span> {/* bigger icon */}
  {item.label}
</button>
            </li>
          ))}
        </ul>

        <div className="mt-auto">
          <button className="btn btn-danger w-100" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main
  className="flex-grow-1 p-4 bg-light overflow-auto"
  style={{
    marginLeft: "300px",  // offset main content by sidebar width
    height: "100vh",
  }}
>
        {active === "dashboard" && (
          <ProtectedComponent>
            <h2>Welcome Cashier</h2>

            <div className="row mb-4">
  <div className="col-md-4 mb-3">
    <div className="card text-white h-100" style={{ backgroundColor: '#0d6efd' }}>
      <div className="card-body">
        <h5 className="card-title">
          <CashStack /> Total Sales
        </h5>
        <p className="card-text fs-4">₱{salesSummary.totalSales.toFixed(2)}</p>
      </div>
    </div>
  </div>

  <div className="col-md-4 mb-3">
    <div className="card text-white h-100" style={{ backgroundColor: '#198754' }}>
      <div className="card-body">
        <h5 className="card-title">
          <Basket /> Transactions
        </h5>
        <p className="card-text fs-4">{salesSummary.totalTransactions}</p>
      </div>
    </div>
  </div>

  <div className="col-md-4 mb-3">
    <div className="card text-white h-100" style={{ backgroundColor: '#ffc107', color: '#000' }}>
      <div className="card-body">
        <h5 className="card-title">Top Items</h5>
        <ul className="list-unstyled mb-0">
          {salesSummary.topItems.map((item, index) => (
            <li key={index} style={{ fontWeight: 500 }}>
              {item.name} ({item.quantity})
            </li>
          ))}
          {salesSummary.topItems.length === 0 && <li>No sales yet</li>}
        </ul>
      </div>
    </div>
  </div>
</div>
            <p className="fw-bold fs-4">Available items for today:</p>
            <div className="row">
              {availableItems.length === 0 && <p>No items available right now.</p>}
              {availableItems.map(item => (
                <div key={item.id} className="col-md-4 mb-3">
                  <div className="card shadow-sm h-100">
                    <div className="card-body d-flex flex-column justify-content-between">
                      <h5 className="card-title">{item.name}</h5>
                      <p className="card-text">Price: ₱{item.price}</p>
                      <span className={`badge ${
                        item.category.includes("A") ? "bg-success" :
                        item.category.includes("B") ? "bg-warning" :
                        "bg-info"
                      }`}>
                        {item.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ProtectedComponent>
        )}

        {active === "pos" && (
          <ProtectedComponent>
            <CashierPOS />
          </ProtectedComponent>
        )}

        {active === "history" && (
          <ProtectedComponent>
            <CashierTransactions />
          </ProtectedComponent>
        )}
      </main>
    </div>
  );
}
