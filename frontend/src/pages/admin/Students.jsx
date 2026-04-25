import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiDownload } from 'react-icons/fi';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import SearchInput from '../../components/common/SearchInput';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../../services/studentService';
import { getClasses } from '../../services/classService';
import { formatDate, getErrorMessage } from '../../utils/helpers';

const EMPTY_FORM = { name: '', email: '', password: '', gender: 'male', dateOfBirth: '', phone: '', address: '', classId: '' };

export default function AdminStudents() {
  const [students, setStudents]   = useState([]);
  const [classes, setClasses]     = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudents({ page, limit: 10, search: search || undefined });
      setStudents(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { getClasses({ limit: 100 }).then((r) => setClasses(r.data.data)).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit   = (s)  => {
    setEditing(s);
    setForm({
      name: s.userId?.name || '', email: s.userId?.email || '', password: '',
      gender: s.gender, dateOfBirth: s.dateOfBirth?.slice(0, 10) || '',
      phone: s.phone || '', address: s.address || '', classId: s.classId?._id || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateStudent(editing._id, { classId: form.classId || null, gender: form.gender, dateOfBirth: form.dateOfBirth, phone: form.phone, address: form.address });
        toast.success('Student updated');
      } else {
        if (!form.password) { toast.error('Password is required'); setSaving(false); return; }
        await createStudent(form);
        toast.success('Student created');
      }
      setShowModal(false);
      fetchStudents();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteStudent(deleting._id);
      toast.success('Student deleted');
      setShowConfirm(false);
      fetchStudents();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: 'admissionNumber', label: 'Adm. No' },
    { key: 'userId', label: 'Name', render: (v) => v?.name || '—' },
    { key: 'userId', label: 'Email', render: (v) => <span className="text-xs text-secondary-500">{v?.email}</span> },
    { key: 'classId', label: 'Class', render: (v) => v ? `${v.name} ${v.section || ''}` : <Badge variant="gray">Unassigned</Badge> },
    { key: 'gender', label: 'Gender', render: (v) => <Badge variant={v === 'male' ? 'info' : 'purple'}>{v}</Badge> },
    { key: 'age', label: 'Age' },
    { key: 'isActive', label: 'Status', render: (v) => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Active' : 'Inactive'}</Badge> },
    { key: '_id', label: 'Actions', render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-500 hover:text-primary-600 transition-colors"><FiEdit2 size={14} /></button>
        <button onClick={() => { setDeleting(row); setShowConfirm(true); }} className="p-1.5 rounded-lg hover:bg-red-50 text-secondary-500 hover:text-red-500 transition-colors"><FiTrash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="page-title">Students</h1><p className="page-subtitle">{pagination.total || 0} total students</p></div>
        <button onClick={openCreate} className="btn-primary"><FiPlus size={16} />Add Student</button>
      </div>

      <div className="card p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or admission number..." />
      </div>

      <Table columns={columns} data={students} loading={loading} emptyMessage="No students found" />
      <Pagination {...pagination} onPage={setPage} />

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Student' : 'Add New Student'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editing && <>
              <div><label className="input-label">Full Name *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="input-label">Email *</label><input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
              <div><label className="input-label">Password *</label><input type="password" className="input-field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            </>}
            <div><label className="input-label">Gender *</label>
              <select className="input-field" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">Male</option><option value="female">Female</option>
              </select>
            </div>
            <div><label className="input-label">Date of Birth *</label><input type="date" className="input-field" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} required /></div>
            <div><label className="input-label">Class</label>
              <select className="input-field" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                <option value="">— Unassigned —</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
              </select>
            </div>
            <div><label className="input-label">Phone</label><input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="input-label">Address</label><input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update' : 'Create Student'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} loading={saving}
        title="Delete Student" message={`Delete ${deleting?.userId?.name}? This will also delete their login account.`} />
    </div>
  );
}