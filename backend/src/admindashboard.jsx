import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="flex">
      <aside className="w-64 h-screen bg-gray-100 p-4">
        <h2 className="text-xl font-bold mb-4">Sidebar</h2>
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">Welcome to Admin Dashboard 🎉</h1>
      </main>
    </div>
  );
}
