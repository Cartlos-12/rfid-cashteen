'use client';

import { useEffect, useState, useMemo } from 'react';
import { Calendar } from 'react-bootstrap-icons';

type UserLog = {
  id: number;
  user_id: string;
  user_name: string;
  role: string;
  action: string;
  details: string | null;
  created_at: string;
};

export default function UsersLogPage() {
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('login');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(''); // For date filter

  const categories = ['login', 'add to cart', 'added item', 'delete', 'update', 'payment confirmed', 'other']; // removed logout

  // Fetch logs function
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = selectedDate || `${yyyy}-${mm}-${dd}`;

      const res = await fetch(
        `${window.location.origin}/api/admin/user-logs?startDate=${dateStr}&endDate=${dateStr}`
      );
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch user logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs only on mount or when date changes
  useEffect(() => {
    fetchLogs();
  }, [selectedDate]);

  const getBadgeClass = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return 'bg-success text-white';
      case 'add to cart':
        return 'bg-primary text-white';
      case 'added item':
        return 'bg-primary text-white';
      case 'delete':
        return 'bg-danger text-white';
      case 'payment confirmed':
        return 'bg-info text-white';
      default:
        return 'bg-secondary text-white';
    }
  };

  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => {
        if (activeCategory === 'login') {
          return log.action.toLowerCase() === 'login'; // removed logout
        }
        return log.action.toLowerCase() === activeCategory;
      })
      .filter(
        log =>
          log.user_name.toLowerCase().includes(search.toLowerCase()) ||
          log.role.toLowerCase().includes(search.toLowerCase()) ||
          log.action.toLowerCase().includes(search.toLowerCase()) ||
          (log.details?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12);
  }, [logs, activeCategory, search]);

  return (
    <div className="container-fluid py-2 vh-100 d-flex flex-column" style={{ overflowY: 'auto' }}>
      <header className="py-2 px-3 border-bottom bg-light shadow-sm mb-3">
        <h1 className="fw-bold text-primary mb-0">System Logs</h1>
      </header>

      {/* Search + Category + Date */}
      <div className="mb-3 d-flex flex-wrap gap-2 align-items-center justify-content-between">
        <input
          type="text"
          className="form-control flex-grow-1"
          placeholder="Search by action, user, role, or details..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: '200px', maxWidth: '350px' }}
        />

        <div className="d-flex gap-2 align-items-center">
          {/* Dropdown */}
          <div className="dropdown">
            <button
              className="btn btn-primary dropdown-toggle"
              type="button"
              onClick={() => setDropdownOpen(prev => !prev)}
              style={{ width: '250px', textAlign: 'center' }}
            >
              Category: {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}
            </button>

            <ul
              className={`dropdown-menu${dropdownOpen ? ' show' : ''}`}
              style={{ width: '250px', maxHeight: '250px', overflowY: 'auto' }}
            >
              {categories.map(cat => (
                <li key={cat}>
                  <button
                    className={`dropdown-item text-capitalize ${
                      activeCategory === cat ? 'selected-category' : ''
                    }`}
                    onClick={() => {
                      setActiveCategory(cat);
                      setDropdownOpen(false);
                    }}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Date Picker */}
          <div
            className="form-control d-flex justify-content-center align-items-center p-0 position-relative"
            style={{ cursor: 'pointer', width: '50px', height: '38px' }}
            onClick={() => {
              const input = document.getElementById('datePicker') as HTMLInputElement;
              if (input) input.showPicker?.();
            }}
          >
            <Calendar style={{ fontSize: '1.2rem', color: '#0d6efd' }} />
            <input
              id="datePicker"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="shadow-sm rounded flex-grow-1" style={{ overflowX: 'scroll', maxHeight: '533px' }}>
        {loading ? (
          <p className="text-center text-muted py-5">Loading logs...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="text-center text-muted py-5">
            No logs found {selectedDate ? `for ${selectedDate}` : 'today'}
          </p>
        ) : (
          <table className="table table-hover align-middle mb-0" style={{ minWidth: '100%' }}>
            <thead className="table-light sticky-top">
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Details</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td>{log.user_name || '-'}</td>
                  <td>{log.role || '-'}</td>
                  <td>
                    <span className={`badge ${getBadgeClass(log.action)}`}>{log.action || '-'}</span>
                  </td>
                  <td>{log.details || '-'}</td>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 767px) {
          .table-responsive {
            font-size: 0.9rem;
          }
          .btn {
            font-size: 0.85rem;
          }
        }
        .table-hover tbody tr:hover {
          background-color: rgba(0, 153, 255, 0.1);
        }
        .badge {
          padding: 0.35em 0.65em;
          font-size: 0.85em;
        }
        .sticky-top {
          top: 0;
          z-index: 10;
        }
        .selected-category {
          background-color: #0d6efd !important;
          color: #fff !important;
          font-weight: bold;
        }
        table {
          width: 100%;
          table-layout: fixed;
        }
        th,
        td {
          word-wrap: break-word;
        }
      `}</style>
    </div>
  );
}
