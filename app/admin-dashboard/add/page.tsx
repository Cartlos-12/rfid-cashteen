'use client';

import { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

type Item = {
  id: number;
  name: string;
  price: number;
  category: string;
  created_at: string;
};

const categories = ['Food Pack A', 'Food Pack B', 'Drink', 'Snack', 'Other'];

export default function AddItemPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ name: '', price: '', category: '' });
  const [editForm, setEditForm] = useState({ id: 0, name: '', price: '', category: '' });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [mounted, setMounted] = useState(false);

  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/admin/items');
      const data = await res.json();
      setItems((data.items || []).map((i: Item) => ({ ...i, price: Number(i.price) })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch items');
    }
  };

  const resetForm = () => setForm({ name: '', price: '', category: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, target: 'form' | 'edit') => {
    const value = e.target.value;
    if (target === 'form') setForm((prev) => ({ ...prev, [e.target.name]: value }));
    else setEditForm((prev) => ({ ...prev, [e.target.name]: value }));
  };

  // Add Item
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category) return toast.warn('All fields are required');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: parseFloat(form.price) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Item added successfully');
        fetchItems();
        resetForm();
      } else toast.error(data.message || 'Failed to add item');
    } catch (err) {
      console.error(err);
      toast.error('Server error');
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: Item) => {
    setEditForm({ id: item.id, name: item.name, price: item.price.toString(), category: item.category });
    setShowEditModal(true);
  };

  // Edit Item
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.price || !editForm.category) return toast.warn('All fields are required');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, price: parseFloat(editForm.price) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Item updated successfully');
        fetchItems();
        setShowEditModal(false);
      } else toast.error(data.message || 'Failed to update item');
    } catch (err) {
      console.error(err);
      toast.error('Server error');
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const openDeleteModal = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/items?id=${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Item deleted');
        fetchItems();
      } else toast.error(data.message || 'Failed to delete');
    } catch (err) {
      console.error(err);
      toast.error('Server error');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const filteredItems = items.filter((i) => {
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'All' || i.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      'Food Pack A': 'bg-success',
      'Food Pack B': 'bg-success',
      Drink: 'bg-info',
      Snack: 'bg-warning text-dark',
      Other: 'bg-secondary',
    };
    return <span className={`badge ${colors[cat] || 'bg-secondary'}`}>{cat}</span>;
  };

  return (
    <main className="min-vh-100 bg-light">
      <ToastContainer position="top-right" autoClose={2000} />

      <div className="container py-3">
        <header className="py-2 px-3 border-bottom bg-light shadow-sm mb-2">
          <h1 className="fw-bold text-primary mb-0">Canteen Item Management</h1>
        </header>

        <div className="row g-4">
          {/* Add Item */}
          <div className="col-lg-4">
            <div className="card shadow rounded-4">
              <div className="card-header bg-gradient fw-bold text-black">Add New Item</div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Item Name</label>
                    <input name="name" value={form.name} onChange={(e) => handleChange(e, 'form')} className="form-control" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Price</label>
                    <div className="input-group">
                      <span className="input-group-text">₱</span>
                      <input type="number" name="price" step="0.01" value={form.price} onChange={(e) => handleChange(e, 'form')} className="form-control" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Category</label>
                    <select name="category" value={form.category} onChange={(e) => handleChange(e, 'form')} className="form-select">
                      <option value="">Select a category</option>
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? 'Processing...' : 'Add Item'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Item Table */}
          <div className="col-lg-8">
            <div className="card shadow rounded-4" style={{ minHeight: '500px' }}>
              <div className="card-header d-flex justify-content-between align-items-center bg-gradient fw-bold text-black">
                <span>Item List</span>
                <div className="d-flex gap-2 w-50">
                  <input
                    className="form-control"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select
                    className="form-select"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="card-body p-0" style={{ height: '540px', overflowY: 'auto' }}>
                <table className="table table-hover mb-0 align-middle">
                  <thead className="table-primary sticky-top">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Category</th>
                      <th>Created</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr style={{ height: '400px' }}>
                        <td colSpan={6} className="text-center py-3 text-muted">
                          No items found.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.name}</td>
                          <td>₱{item.price.toFixed(2)}</td>
                          <td>{categoryBadge(item.category)}</td>
                          <td>{mounted ? new Date(item.created_at).toLocaleString() : ''}</td>
                          <td className="text-center">
                            <button className="btn btn-sm btn-primary me-1" onClick={() => openEditModal(item)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => openDeleteModal(item.id)}>Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton className="bg-gradient text-white fw-bold">
          <Modal.Title>Edit Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleEditSubmit}>
            <div className="mb-3">
              <label className="form-label">Item Name</label>
              <input name="name" value={editForm.name} onChange={(e) => handleChange(e, 'edit')} className="form-control" />
            </div>
            <div className="mb-3">
              <label className="form-label">Price</label>
              <div className="input-group">
                <span className="input-group-text">₱</span>
                <input type="number" step="0.01" name="price" value={editForm.price} onChange={(e) => handleChange(e, 'edit')} className="form-control" />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Category</label>
              <select name="category" value={editForm.category} onChange={(e) => handleChange(e, 'edit')} className="form-select">
                <option value="">Select a category</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* Delete Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="bg-gradient text-white fw-bold">
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this item? This action cannot be undone.</p>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="outline-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</Button>
          </div>
        </Modal.Body>
      </Modal>
    </main>
  );
}
