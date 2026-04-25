import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getClasses, createClass, updateClass, deleteClass } from '../../services/classService';
import { getErrorMessage } from '../../utils/helpers';
import { SESSIONS } from '../../utils/constants';
import api from '../../services/api';

const EMPTY = { name: '', section: '', academicYear: '2025/2026', classTeacherId: '' };

export default function AdminClasses() {
  const [classes, setClasses]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(EMPTY);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, sr] = await Promise.all([getClasses({ limit: 100 }), api.get('/subjects', { params: { limit: 100 } })]);
      setClasses(cr.data.data);
      const tMap = {};
      sr.data.data.forEach((s) => { if (s.teacherId) tMap[s.teacherId._id] = s.teacherId; });
      setTeachers(Object.values(tMap));
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit   = (c) => { setEditing(c); setForm({ name: c.name, section: c.section || '', academicYear: c.academicYear, classTeacherId: c.classTeacherId?._id || '' }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, classTeacherId: form.classTeacherId || null };
      editing ? await updateClass(editing._id, payload) : await createClass(payload);
      toast.success(editing ? 'Class updated' : 'Class created');
      setShowModal(false); fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await deleteClass(deleting._id); toast.success('Class deleted'); setShowConfirm(false); fetchAll(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: 'name',    label: 'Class Name' },
    { key: 'section', label: 'Section', render: (v) => v || '—' },
    { key: 'academicYear', label: 'Session' },
    { key: 'classTeacherId', label: 'Class Teacher', render: (v) => v?.name || <Badge variant="gray">Not assigned</Badge> },
    { key: 'studentCount', label: 'Students', render: (v) => <Badge variant="info">{v ?? 0}</Badge> },
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
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Classes</h1><p className="page-subtitle">{classes.length} classes configured</p></div>
        <button onClick={openCreate} className="btn-primary"><FiPlus size={16} />Add Class</button>
      </div>
      <Table columns={columns} data={classes} loading={loading} emptyMessage="No classes found" />
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Class' : 'Add New Class'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Class Name *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. JSS 1" required /></div>
            <div><label className="input-label">Section/Arm</label><input className="input-field" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. A" /></div>
            <div><label className="input-label">Academic Year *</label>
              <select className="input-field" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}>
                {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="input-label">Class Teacher</label>
              <select className="input-field" value={form.classTeacherId} onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}>
                <option value="">— None —</option>
                {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} loading={saving}
        title="Delete Class" message={`Delete ${deleting?.name} ${deleting?.section || ''}? Students in this class will be unassigned.`} />
    </div>
  );
}