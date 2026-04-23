import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const EMOJIS = ['🧱','🏗️','🏖️','🔩','👷','⚡','📋','🔧','🪟','🎨','🏠','🪵','🔑','🚿','💡','🔌'];

export default function CategoriesPage() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', icon: '🧱' });

  useEffect(() => { fetchCats(); }, []);

  const fetchCats = async () => {
    try {
      const { data } = await api.get('/categories');
      setCats(data);
    } catch { setCats([]); }
    finally { setLoading(false); }
  };

  const save = async () => {
    if (!form.name) return toast.error('Name required');
    try {
      if (editId) {
        const { data } = await api.put(`/categories/${editId}`, form);
        setCats(prev => prev.map(c => c._id === editId ? data : c));
        toast.success('Category updated');
      } else {
        const { data } = await api.post('/categories', form);
        setCats(prev => [...prev, data]);
        toast.success('Category added');
      }
      setAdding(false);
      setEditId(null);
      setForm({ name: '', icon: '🧱' });
    } catch { toast.error('Failed'); }
  };

  const deleteCat = async (id) => {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCats(prev => prev.filter(c => c._id !== id));
      toast.success('Deleted');
    } catch {}
  };

  const toggleActive = async (cat) => {
    try {
      const { data } = await api.put(`/categories/${cat._id}`, { isActive: !cat.isActive });
      setCats(prev => prev.map(c => c._id === cat._id ? data : c));
    } catch {}
  };

  return (
    <div>
      <div className="topbar">
        <h2>🗂️ Categories</h2>
        <button className="btn btn-primary" onClick={() => { setAdding(true); setEditId(null); setForm({ name: '', icon: '🧱' }); }}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Add/Edit Form */}
      {(adding || editId) && (
        <div className="table-wrap" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>{editId ? 'Edit Category' : 'Add New Category'}</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Name</label>
              <input className="form-input" placeholder="Category name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Icon</label>
              <select className="form-select" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} style={{ width: 80 }}>
                {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-success" onClick={save}><Check size={16} /> Save</button>
              <button className="btn btn-ghost" onClick={() => { setAdding(false); setEditId(null); }}><X size={16} /></button>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <div className="table-header"><h3>All Categories</h3></div>
        {loading ? <div className="spinner" /> : (
          <table>
            <thead>
              <tr><th>Icon</th><th>Name</th><th>Order</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {cats.map(cat => (
                <tr key={cat._id}>
                  <td style={{ fontSize: 28 }}>{cat.icon}</td>
                  <td style={{ fontWeight: 600 }}>{cat.name}</td>
                  <td>{cat.order}</td>
                  <td>
                    <span className={`badge ${cat.isActive ? 'badge-active' : 'badge-rejected'}`} style={{ cursor: 'pointer' }} onClick={() => toggleActive(cat)}>
                      {cat.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(cat._id); setAdding(false); setForm({ name: cat.name, icon: cat.icon }); }}>
                        <Edit size={13} /> Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteCat(cat._id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
