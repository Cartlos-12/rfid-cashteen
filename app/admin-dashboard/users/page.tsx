'use client';

import { useEffect, useState, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

type User = {
  id: string;
  name: string;
  email: string;
  rfid: string;
  created_at: string | Date;
  balance?: number;
};

type SortConfig = {
  key: keyof User;
  direction: 'asc' | 'desc';
};

export default function UsersPage() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [editID, setEditID] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  const totalPages = Math.ceil(users.length / usersPerPage);

  useEffect(() => {
    fetchUsers();
    scannerInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!scannerInputRef.current) return;
      if (e.key === 'Enter') {
        const scannedValue = scannerInputRef.current.value.trim();
        if (scannedValue) setSearch(scannedValue);
        scannerInputRef.current.value = '';
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setAllUsers(data.users || []);
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    }
  };

  useEffect(() => {
    if (!search.trim()) {
      setUsers(allUsers);
    } else {
      const filtered = allUsers.filter(u =>
        u.id.toString().includes(search) ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.rfid.toLowerCase().includes(search.toLowerCase())
      );
      setUsers(filtered);
    }
    setCurrentPage(1);
  }, [search, allUsers]);

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [deleteUser.id] }),
      });
      const data = await res.json();
      if (res.ok) {
        setAllUsers(prev => prev.filter(u => u.id !== deleteUser.id));
        setNotification('User deleted successfully.');
        setDeleteUser(null);
      } else setNotification(data.message || 'Failed to delete user.');
    } catch (err) {
      console.error(err);
      setNotification('Error deleting user.');
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditID(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
  };

  const handleEditSave = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldId: editingUser.id,
          id: editID,
          name: editName,
          email: editEmail,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAllUsers(prev =>
          prev.map(u =>
            u.id === editingUser.id
              ? { ...u, id: editID, name: editName, email: editEmail }
              : u
          )
        );
        setEditingUser(null);
        setNotification('User updated successfully.');
      } else setNotification(data.message || 'Failed to update user.');
    } catch (err) {
      console.error(err);
      setNotification('Error updating user.');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortConfig) return 0;
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    if (sortConfig.key === 'created_at') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: keyof User) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // Pagination slice
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);

  return (
    <div className="d-flex flex-column h-100 p-3">
      <header className="py-2 px-3 border-bottom bg-light shadow-sm">
        <h1 className="fw-bold text-primary mb-0">Users</h1>
      </header>

      {notification && <div className="alert alert-info py-2">{notification}</div>}

      <div className="mb-2 mt-3 d-flex gap-2 flex-wrap align-items-center">
        <input
          type="text"
          placeholder="Search by ID, name, email, or scan RFID..."
          className="form-control"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <button className="btn btn-primary" onClick={() => scannerInputRef.current?.focus()}>Scan</button>
        <input type="text" ref={scannerInputRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
      </div>

      {/* Scrollable Table */}
      <div className="table-responsive flex-grow-1" style={{ maxHeight: '500px', overflowY: 'auto' }}>
        <table className="table table-hover table-bordered align-middle text-center">
          <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr>
              <th onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>ID</th>
              <th onClick={() => requestSort('name')} style={{ cursor: 'pointer' }}>Full Name</th>
              <th onClick={() => requestSort('email')} style={{ cursor: 'pointer' }}>Email</th>
              <th onClick={() => requestSort('rfid')} style={{ cursor: 'pointer' }}>RFID</th>
              <th onClick={() => requestSort('balance')} style={{ cursor: 'pointer' }}>Balance</th>
              <th onClick={() => requestSort('created_at')} style={{ cursor: 'pointer' }}>Registered At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map(u => (
              <tr
                key={u.id}
                className={search && (u.id.toString() === search || u.rfid.toLowerCase() === search.toLowerCase()) ? 'table-success' : ''}
              >
                <td>{u.id}</td>
                <td className="text-start">{u.name}</td>
                <td>{u.email}</td>
                <td>{u.rfid}</td>
                <td>₱{Number(u.balance || 0).toFixed(2)}</td>
                <td>{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                <td>
                  <div className="d-flex justify-content-center gap-2">
                    <button className="btn btn-sm btn-primary" onClick={() => openEditModal(u)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteUser(u)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="d-flex justify-content-center align-items-center gap-3 py-3 border-top bg-light mt-auto sticky-bottom">
        <button
          className="btn btn-primary"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          className="btn btn-primary"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        >
          Next
        </button>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Edit User</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setEditingUser(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">ID</label>
                  <input type="text" className="form-control" value={editID} onChange={e => setEditID(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-control" value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleEditSave}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteUser && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setDeleteUser(null)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>{deleteUser.name}</strong>? This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteUser(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
