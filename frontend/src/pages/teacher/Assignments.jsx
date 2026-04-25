import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiClipboard } from 'react-icons/fi';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import api from '../../services/api';
import { formatDate, getErrorMessage, isOverdue } from '../../utils/helpers';
import { TERMS, SESSIONS } from '../../utils/constants';

const EMPTY = { classId: '', subjectId: '', title: '', question: '', dueDate: '', maxScore: 20, term: 'first', session: '2025/2026' };

export default function TeacherAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects]       = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editing, setEditing]         = useState(null);
  const [deleting, setDeleting]       = useState(null);
  const [viewing, setViewing]         = useState(null);
  const [saving, setSaving]           = useState(false);
  const [gradeForm, setGradeForm]     = useState({});
  const [form, setForm]               = useState(EMPTY);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ar, sr] = await Promise.all([
        api.get('/assignments', { params: { limit: 50 } }),
        api.get('/subjects', { params: { limit: 50 } }),
      ]);
      setAssignments(ar.data.data);
      setSubjects(sr.data.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const classesFromSubjects = [...new Map(subjects.filter(s => s.classId).map(s => [s.classId._id, s.classId])).values()];
  const filteredSubjects = form.classId ? subjects.filter(s => s.classId?._id === form.classId) : subjects;

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit   = (a) => {
    setEditing(a);
    setForm({ classId: a.classId?._id || '', subjectId: a.subjectId?._id || '', title: a.title, question: a.question, dueDate: a.dueDate?.slice(0, 10) || '', maxScore: a.maxScore, term: a.term, session: a.session });
    setShowModal(true);
  };

  const viewSubmissions = async (a) => {
    setViewing(a);
    setShowSubmissions(true);
    try {
      const res = await api.get(`/assignments/${a._id}/submissions`);
      setSubmissions(res.data.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      editing
        ? await api.patch(`/assignments/${editing._id}`, form)
        : await api.post('/assignments', { ...form, maxScore: Number(form.maxScore) });
      toast.success(editing ? 'Assignment updated' : 'Assignment created');
      setShowModal(false); fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await api.delete(`/assignments/${deleting._id}`); toast.success('Deleted'); setShowConfirm(false); fetchAll(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleGrade = async (submissionId) => {
    const gf = gradeForm[submissionId];
    if (!gf?.score) { toast.error('Enter a score'); return; }
    try {
      await api.patch(`/submissions/${submissionId}/grade`, { score: Number(gf.score), feedback: gf.feedback || '' });
      toast.success('Graded successfully');
      viewSubmissions(viewing);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const submissionColumns = [
    { key: 'studentId', label: 'Student', render: (v) => v?.userId?.name || '—' },
    { key: 'answer',    label: 'Answer',  render: (v) => v ? <span className="text-xs text-secondary-500 line-clamp-1 max-w-48">{v}</span> : <Badge variant="info">File submitted</Badge> },
    { key: 'status',    label: 'Status',  render: (v) => <Badge variant={v === 'graded' ? 'success' : 'warning'}>{v}</Badge> },
    { key: 'score',     label: 'Score',   render: (v, row) => v !== null ? `${v}/${viewing?.maxScore}` : '—' },
    { key: '_id', label: 'Grade', render: (id, row) => row.status !== 'graded' ? (
      <div className="flex items-center gap-2">
        <input type="number" min="0" max={viewing?.maxScore} placeholder="Score"
          className="input-field py-1 text-xs w-16"
          value={gradeForm[id]?.score || ''}
          onChange={(e) => setGradeForm(f => ({ ...f, [id]: { ...f[id], score: e.target.value } }))} />
        <input type="text" placeholder="Feedback"
          className="input-field py-1 text-xs w-28"
          value={gradeForm[id]?.feedback || ''}
          onChange={(e) => setGradeForm(f => ({ ...f, [id]: { ...f[id], feedback: e.target.value } }))} />
        <button onClick={() => handleGrade(id)} className="btn-primary py-1 text-xs">Grade</button>
      </div>
    ) : <span className="text-xs text-secondary-400">Graded</span> },
  ];

  const columns = [
    { key: 'title',     label: 'Title' },
    { key: 'subjectId', label: 'Subject', render: (v) => v?.name || '—' },
    { key: 'classId',   label: 'Class',   render: (v) => v ? `${v.name} ${v.section || ''}` : '—' },
    { key: 'maxScore',  label: 'Max Score' },
    { key: 'dueDate',   label: 'Due Date', render: (v) => <span className={isOverdue(v) ? 'text-red-500' : ''}>{formatDate(v)}</span> },
    { key: 'isActive',  label: 'Status',  render: (v, row) => <Badge variant={isOverdue(row.dueDate) ? 'danger' : 'success'}>{isOverdue(row.dueDate) ? 'Overdue' : 'Active'}</Badge> },
    { key: '_id', label: 'Actions', render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={() => viewSubmissions(row)} className="p-1.5 rounded-lg hover:bg-blue-50 text-secondary-400 hover:text-blue-600 transition-colors" title="View Submissions"><FiEye size={14} /></button>
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-secondary-100 text-secondary-400 hover:text-primary-600 transition-colors"><FiEdit2 size={14} /></button>
        <button onClick={() => { setDeleting(row); setShowConfirm(true); }} className="p-1.5 rounded-lg hover:bg-red-50 text-secondary-400 hover:text-red-500 transition-colors"><FiTrash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Assignments</h1><p className="page-subtitle">{assignments.length} assignments</p></div>
        <button onClick={openCreate} className="btn-primary"><FiPlus size={16} />Create Assignment</button>
      </div>

      {loading ? <div className="py-12 text-center text-secondary-400">Loading...</div> :
      assignments.length === 0 ? (
        <div className="card text-center py-12">
          <FiClipboard size={36} className="text-secondary-200 mx-auto mb-3" />
          <p className="text-secondary-400 text-sm">No assignments yet.</p>
        </div>
      ) : <Table columns={columns} data={assignments} loading={loading} />}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Assignment' : 'Create Assignment'} size="lg">
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
            <div className="col-span-2"><label className="input-label">Title *</label><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="col-span-2"><label className="input-label">Question *</label><textarea rows={3} className="input-field" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} required /></div>
            <div><label className="input-label">Due Date *</label><input type="date" className="input-field" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required /></div>
            <div><label className="input-label">Max Score *</label><input type="number" min="1" max="100" className="input-field" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} required /></div>
            <div><label className="input-label">Term</label>
              <select className="input-field" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="input-label">Session</label>
              <select className="input-field" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })}>
                {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Submissions Modal */}
      <Modal isOpen={showSubmissions} onClose={() => setShowSubmissions(false)} title={`Submissions — ${viewing?.title}`} size="xl">
        <Table columns={submissionColumns} data={submissions} loading={false} emptyMessage="No submissions yet" />
      </Modal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} loading={saving}
        title="Delete Assignment" message={`Delete "${deleting?.title}"? All submissions will also be deleted.`} />
    </div>
  );
}