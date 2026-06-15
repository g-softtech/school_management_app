import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiUserCheck } from 'react-icons/fi';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getSubjects, createSubject, updateSubject, assignTeacher, deleteSubject } from '../../services/subjectService';
import { getClasses } from '../../services/classService';
import { getErrorMessage } from '../../utils/helpers';
import api from '../../services/api';

const EMPTY = { name: '', code: '', classId: '', teacherId: '', description: '' };

export default function AdminSubjects() {
  const [subjects, setSubjects]   = useState([]);
  const [classes, setClasses]     = useState([]);
  const [teachers, setTeachers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAssign, setShowAssign]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [teacherId, setTeacherId] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, cr, tr] = await Promise.all([
        api.get('/subjects', { params: { limit: 500, classId: filterClass || undefined } }),
        getClasses({ limit: 100 }),
        // Load ALL teachers from user directory — not just those already assigned
        api.get('/users/directory', { params: { role: 'teacher', limit: 200 } }),
      ]);
      setSubjects(sr.data.data || []);
      setClasses(cr.data.data || []);
      setTeachers(tr.data.data || []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [filterClass]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit   = (s) => { setEditing(s); setForm({ name: s.name, code: s.code, classId: s.classId?._id || '', teacherId: s.teacherId?._id || '', description: s.description || '' }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      editing ? await updateSubject(editing._id, form) : await createSubject(form);
      toast.success(editing ? 'Subject updated' : 'Subject created');
      setShowModal(false); fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleAssign = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await assignTeacher(assigning._id, { teacherId });
      toast.success('Teacher assigned successfully');
      setShowAssign(false); fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await deleteSubject(deleting._id); toast.success('Subject deleted'); setShowConfirm(false); fetchAll(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: 'name',      label: 'Subject' },
    { key: 'code',      label: 'Code', render: (v) => <Badge variant="gold">{v}</Badge> },
    { key: 'classId',   label: 'Class', render: (v) => v ? `${v.name} ${v.section || ''}` : '—' },
    { key: 'teacherId', label: 'Teacher', render: (v) => v?.name || <Badge variant="gray">Unassigned</Badge> },
    { key: 'isActive',  label: 'Status', render: (v) => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Active' : 'Inactive'}</Badge> },
    { key: '_id', label: 'Actions', render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={() => { setAssigning(row); setTeacherId(row.teacherId?._id || ''); setShowAssign(true); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-secondary-500 hover:text-blue-600 transition-colors" title="Assign Teacher"><FiUserCheck size={14} /></button>
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-500 hover:text-primary-600 transition-colors"><FiEdit2 size={14} /></button>
        <button onClick={() => { setDeleting(row); setShowConfirm(true); }} className="p-1.5 rounded-lg hover:bg-red-50 text-secondary-500 hover:text-red-500 transition-colors"><FiTrash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="page-title">Subjects</h1><p className="page-subtitle">{subjects.length} subjects</p></div>
        <div className="flex gap-2">
          <select className="input-field py-1.5 text-sm w-40" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((c) => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
          </select>
          <button onClick={openCreate} className="btn-primary"><FiPlus size={16} />Add Subject</button>
        </div>
      </div>
      <Table columns={columns} data={subjects} loading={loading} emptyMessage="No subjects found" />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Subject' : 'Add Subject'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="input-label">Subject Name *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="input-label">Code *</label><input className="input-field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></div>
            <div><label className="input-label">Class *</label>
              <select className="input-field" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required>
                <option value="">— Select Class —</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
              </select>
            </div>
            <div><label className="input-label">Teacher</label>
              <select className="input-field" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
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

      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title={`Assign Teacher — ${assigning?.name}`} size="sm">
        <form onSubmit={handleAssign} className="space-y-4">
          <div><label className="input-label">Select Teacher</label>
            <select className="input-field" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required>
              <option value="">— Select —</option>
              {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowAssign(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Assigning...' : 'Assign'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} loading={saving}
        title="Delete Subject" message={`Delete ${deleting?.name} (${deleting?.code})?`} />
    </div>
  );
}