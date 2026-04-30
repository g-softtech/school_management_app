import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiUsers, FiBook, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getClasses, createClass, updateClass, deleteClass } from '../../services/classService';
import { getErrorMessage } from '../../utils/helpers';
import { SESSIONS } from '../../utils/constants';
import api from '../../services/api';

const EMPTY = { name: '', section: '', academicYear: '2025/2026', classTeacherId: '' };

export default function AdminClasses() {
  const [classes,   setClasses]   = useState([]);
  const [teachers,  setTeachers]  = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState(EMPTY);
  const [expanded,  setExpanded]  = useState(null); // class _id whose subjects are shown

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, tr, sr] = await Promise.all([
        getClasses({ limit: 100 }),
        // Load ALL teachers directly from users directory
        api.get('/users/directory', { params: { role: 'teacher', limit: 200 } }),
        api.get('/subjects', { params: { limit: 500 } }),
      ]);
      setClasses(cr.data.data || []);
      setTeachers(tr.data.data || []);
      setSubjects(sr.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit   = (c) => {
    setEditing(c);
    setForm({ name: c.name, section: c.section || '', academicYear: c.academicYear, classTeacherId: c.classTeacherId?._id || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.academicYear) { toast.error('Class name and session are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, classTeacherId: form.classTeacherId || null };
      editing ? await updateClass(editing._id, payload) : await createClass(payload);
      toast.success(editing ? 'Class updated' : 'Class created');
      setShowModal(false);
      fetchAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteClass(deleting._id);
      toast.success('Class deleted');
      setShowConfirm(false);
      fetchAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Get subjects for a specific class
  const classSubjects = (classId) => subjects.filter((s) => (s.classId?._id || s.classId) === classId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Classes</h1>
          <p className="page-subtitle">{classes.length} classes configured</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <FiPlus size={16} /> Add Class
        </button>
      </div>

      {loading ? (
        <div className="card space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-secondary-50 rounded-xl animate-pulse" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="card text-center py-14 text-secondary-400">
          <FiBook size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No classes yet</p>
          <p className="text-xs mt-1">Click "Add Class" to get started</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary-50">
                {['Class Name','Section','Session','Class Teacher','Students','Status','Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-secondary-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => {
                const clsSubs    = classSubjects(cls._id);
                const isExpanded = expanded === cls._id;
                return (
                  <>
                    <tr key={cls._id} className="border-t border-secondary-50 hover:bg-secondary-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-secondary-800">{cls.name}</td>
                      <td className="px-4 py-3 text-secondary-600">{cls.section || '—'}</td>
                      <td className="px-4 py-3 text-secondary-600">{cls.academicYear}</td>
                      <td className="px-4 py-3 text-secondary-600">
                        {cls.classTeacherId?.name
                          ? <span className="font-medium">{cls.classTeacherId.name}</span>
                          : <Badge variant="gray">Not assigned</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{cls.studentCount ?? 0}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={cls.isActive ? 'success' : 'danger'}>{cls.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Toggle subjects */}
                          <button
                            onClick={() => setExpanded(isExpanded ? null : cls._id)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-secondary-500 hover:text-blue-600 transition-colors"
                            title={isExpanded ? 'Hide subjects' : `View subjects (${clsSubs.length})`}
                          >
                            {isExpanded ? <FiChevronUp size={14} /> : <FiBook size={14} />}
                          </button>
                          <button onClick={() => openEdit(cls)} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-500 hover:text-primary-600 transition-colors">
                            <FiEdit2 size={14} />
                          </button>
                          <button onClick={() => { setDeleting(cls); setShowConfirm(true); }} className="p-1.5 rounded-lg hover:bg-red-50 text-secondary-500 hover:text-red-500 transition-colors">
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable subjects row */}
                    {isExpanded && (
                      <tr key={`${cls._id}-subjects`} className="bg-blue-50/50 border-t border-blue-100">
                        <td colSpan={7} className="px-6 py-3">
                          <p className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <FiBook size={12} className="text-primary-500" /> Subjects in {cls.name} {cls.section}
                          </p>
                          {clsSubs.length === 0 ? (
                            <p className="text-xs text-secondary-400 italic">No subjects assigned to this class yet. Go to Subjects to add them.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {clsSubs.map((s) => (
                                <div key={s._id} className="flex items-center gap-2 bg-white border border-secondary-200 rounded-xl px-3 py-1.5">
                                  <span className="text-xs font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded font-mono">{s.code}</span>
                                  <span className="text-xs font-medium text-secondary-800">{s.name}</span>
                                  {s.teacherId ? (
                                    <span className="text-xs text-secondary-400">· {s.teacherId.name}</span>
                                  ) : (
                                    <span className="text-xs text-red-400 italic">· Unassigned</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Class' : 'Add New Class'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Class Name *</label>
              <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. JSS 1" required />
            </div>
            <div>
              <label className="input-label">Section / Arm</label>
              <input className="input-field" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. A" />
            </div>
            <div>
              <label className="input-label">Academic Session *</label>
              <select className="input-field" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}>
                {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Class Teacher</label>
              <select className="input-field" value={form.classTeacherId} onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}>
                <option value="">— None —</option>
                {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        loading={saving}
        title="Delete Class"
        message={`Delete ${deleting?.name} ${deleting?.section || ''}? This cannot be undone.`}
      />
    </div>
  );
}
