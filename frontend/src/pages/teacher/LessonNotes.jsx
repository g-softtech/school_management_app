import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiFileText } from 'react-icons/fi';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import api from '../../services/api';
import { formatDate, getErrorMessage, truncate } from '../../utils/helpers';
import { TERMS, SESSIONS } from '../../utils/constants';

const EMPTY = { classId: '', subjectId: '', topic: '', week: 1, term: 'first', session: '2025/2026', content: '' };

export default function TeacherLessonNotes() {
  const [notes, setNotes]         = useState([]);
  const [subjects, setSubjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [filterTerm, setFilterTerm] = useState('');

  const subjectMap = {};
  subjects.forEach((s) => { subjectMap[s._id] = s; });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [nr, sr] = await Promise.all([
        api.get('/lesson-notes', { params: { limit: 50, term: filterTerm || undefined } }),
        api.get('/subjects', { params: { limit: 50 } }),
      ]);
      setNotes(nr.data.data);
      setSubjects(sr.data.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [filterTerm]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const classesFromSubjects = [...new Map(subjects.filter(s => s.classId).map(s => [s.classId._id, s.classId])).values()];
  const filteredSubjects = form.classId ? subjects.filter(s => s.classId?._id === form.classId) : subjects;

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit   = (n) => {
    setEditing(n);
    setForm({ classId: n.classId?._id || '', subjectId: n.subjectId?._id || '', topic: n.topic, week: n.week, term: n.term, session: n.session, content: n.content || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      editing
        ? await api.patch(`/lesson-notes/${editing._id}`, form)
        : await api.post('/lesson-notes', form);
      toast.success(editing ? 'Lesson note updated' : 'Lesson note created');
      setShowModal(false); fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await api.delete(`/lesson-notes/${deleting._id}`); toast.success('Deleted'); setShowConfirm(false); fetchAll(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="page-title">Lesson Notes</h1><p className="page-subtitle">{notes.length} notes</p></div>
        <div className="flex gap-2">
          <select className="input-field py-1.5 text-sm w-32" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
            <option value="">All Terms</option>
            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={openCreate} className="btn-primary"><FiPlus size={16} />Add Note</button>
        </div>
      </div>

      {loading ? <div className="py-12 text-center text-secondary-400">Loading...</div> :
      notes.length === 0 ? (
        <div className="card text-center py-12">
          <FiFileText size={36} className="text-secondary-200 mx-auto mb-3" />
          <p className="text-secondary-400 text-sm">No lesson notes yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((n) => (
            <div key={n._id} className="card hover:shadow-card-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-secondary-800 truncate">{n.topic}</p>
                  <p className="text-xs text-secondary-400 mt-0.5">{n.subjectId?.name} · {n.classId?.name} {n.classId?.section}</p>
                </div>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => openEdit(n)} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-400 hover:text-primary-600 transition-colors"><FiEdit2 size={13} /></button>
                  <button onClick={() => { setDeleting(n); setShowConfirm(true); }} className="p-1.5 rounded-lg hover:bg-red-50 text-secondary-400 hover:text-red-500 transition-colors"><FiTrash2 size={13} /></button>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                <Badge variant="gold">Week {n.week}</Badge>
                <Badge variant="info">{n.term} term</Badge>
                {!n.isPublished && <Badge variant="warning">Draft</Badge>}
              </div>
              {n.content && <p className="text-xs text-secondary-500 leading-relaxed">{truncate(n.content, 100)}</p>}
              <p className="text-xs text-secondary-300 mt-2">{formatDate(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Lesson Note' : 'Create Lesson Note'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Class *</label>
              <select className="input-field" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value, subjectId: '' })} required>
                <option value="">— Select Class —</option>
                {classesFromSubjects.map((c) => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
              </select>
            </div>
            <div><label className="input-label">Subject *</label>
              <select className="input-field" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
                <option value="">— Select Subject —</option>
                {filteredSubjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="input-label">Topic *</label><input className="input-field" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} required /></div>
            <div><label className="input-label">Week *</label><input type="number" min="1" max="20" className="input-field" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} required /></div>
            <div><label className="input-label">Term *</label>
              <select className="input-field" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="input-label">Session</label>
              <select className="input-field" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })}>
                {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="input-label">Published</label>
              <select className="input-field" value={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.value === 'true' })}>
                <option value="true">Yes — visible to students</option>
                <option value="false">No — draft</option>
              </select>
            </div>
            <div className="col-span-2"><label className="input-label">Content</label>
              <textarea rows={5} className="input-field" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Enter lesson content here..." />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} loading={saving}
        title="Delete Lesson Note" message={`Delete "${deleting?.topic}"?`} />
    </div>
  );
}